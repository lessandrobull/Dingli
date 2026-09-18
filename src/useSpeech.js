import { useState, useRef, useCallback, useEffect } from 'react';

const SUPABASE_AUDIO_BASE = "https://lxdmfaxxxfyzbpzvniyi.supabase.co/storage/v1/object/public/audios";

let globalAudioPlayer = null;
let globalShuffleBags = {};
let globalVoiceIndexLegacy = 0;

export const useSpeech = ({
    idiomaEstudo,
    temas,
    frasesFiltradas,
    indice,
    fraseAtiva,
    onAvaliacaoConcluida
}) => {
    const [estaOuvindo, setEstaOuvindo] = useState(false);
    const [statusVoz, setStatusVoz] = useState('IDLE');
    const [transcricaoAoVivo, setTranscricaoAoVivo] = useState("");
    const [volume, setVolume] = useState(0);

    const animationFrameRef = useRef(null);
    const timerSilencioRef = useRef(null);
    const tentativasVozRef = useRef(0);
    const processandoAcertoRef = useRef(false);
    const estaGravandoRef = useRef(false);
    const fraseAlvoRef = useRef(null);

    useEffect(() => {
        tentativasVozRef.current = 0;
        if (globalAudioPlayer) {
            globalAudioPlayer.pause();
            globalAudioPlayer.src = "";
            globalAudioPlayer = null;
        }
    }, [indice]);

    const obterProximaVozShuffleBag = useCallback((fraseId, totalVozes = 6) => {
        if (!globalShuffleBags[fraseId] || globalShuffleBags[fraseId].length === 0) {
            const vozes = Array.from({ length: totalVozes }, (_, i) => i + 1);
            for (let i = vozes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [vozes[i], vozes[j]] = [vozes[j], vozes[i]];
            }
            globalShuffleBags[fraseId] = vozes;
        }
        return globalShuffleBags[fraseId].pop();
    }, []);

    const executarSpeechSynthesisFallback = useCallback((texto, lento, callback) => {
        const synth = window.speechSynthesis;
        synth.cancel();

        setTimeout(() => {
            const voices = synth.getVoices().filter(v => {
                const name = v.name.toLowerCase();
                const lang = temas[idiomaEstudo]?.langCode?.split('-')[0]?.toLowerCase();
                const isQuality = name.includes('natural') || name.includes('neural') || name.includes('premium') || name.includes('online');
                return v.lang.toLowerCase().includes(lang) && (!name.includes('google') || isQuality) && (!name.includes('microsoft') || isQuality);
            });
            const selectedVoice = voices.length > 0 ? voices[globalVoiceIndexLegacy % voices.length] : null;
            if (voices.length > 0) globalVoiceIndexLegacy += 1;

            const msg = new SpeechSynthesisUtterance(texto);
            window.utterance = msg;
            if (selectedVoice) msg.voice = selectedVoice;
            msg.rate = lento ? 0.75 : 0.9;
            msg.lang = temas[idiomaEstudo]?.langCode || 'en-US';
            msg.onend = () => {
                if (callback) callback();
                window.utterance = null;
            };
            synth.resume();
            synth.speak(msg);
        }, 50);
    }, [idiomaEstudo, temas]);

    const falar = useCallback((texto, lento = false, callback) => {
        if (!texto) return;

        // Silencia qualquer reprodução ativa antes de iniciar a nova
        if (globalAudioPlayer) {
            globalAudioPlayer.pause();
            globalAudioPlayer.src = "";
            globalAudioPlayer = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        const fraseAtual = fraseAlvoRef.current || fraseAtiva || (frasesFiltradas && frasesFiltradas[indice]);
        const fraseId = fraseAtual?.id;

        if (idiomaEstudo === 'en' && fraseId) {
            const vIndex = obterProximaVozShuffleBag(fraseId, 6);
            const audioUrl = `${SUPABASE_AUDIO_BASE}/en/${fraseId}_v${vIndex}.mp3`;

            const audio = new Audio(audioUrl);
            globalAudioPlayer = audio;
            audio.playbackRate = lento ? 0.75 : 1.0;

            audio.onended = () => {
                if (globalAudioPlayer === audio) globalAudioPlayer = null;
                if (callback) callback();
            };

            audio.onerror = () => {
                if (globalAudioPlayer === audio) {
                    globalAudioPlayer = null;
                    executarSpeechSynthesisFallback(texto, lento, callback);
                }
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    // Ignora interrupções normais causadas por troca rápida de tela/card
                    if (err.name === 'AbortError') return;
                    if (globalAudioPlayer === audio) {
                        globalAudioPlayer = null;
                        executarSpeechSynthesisFallback(texto, lento, callback);
                    }
                });
            }
            return;
        }

        executarSpeechSynthesisFallback(texto, lento, callback);
    }, [idiomaEstudo, fraseAtiva, frasesFiltradas, indice, obterProximaVozShuffleBag, executarSpeechSynthesisFallback]);

    const pararMonitoramentoAudio = useCallback(() => {
        estaGravandoRef.current = false;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setVolume(0);
    }, []);

    const animarVolumeOnda = useCallback(() => {
        if (!estaGravandoRef.current) {
            setVolume(0);
            return;
        }
        const oscilacao = 6 + Math.sin(Date.now() / 90) * 4 + Math.random() * 4;
        setVolume(oscilacao);
        animationFrameRef.current = requestAnimationFrame(animarVolumeOnda);
    }, []);

    const iniciarReconhecimentoVoz = (fraseParam) => {
        if (statusVoz !== 'IDLE') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        if (globalAudioPlayer) {
            globalAudioPlayer.pause();
            globalAudioPlayer.src = "";
            globalAudioPlayer = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }

        const fraseAtual = fraseParam || fraseAtiva || (frasesFiltradas && frasesFiltradas[indice]);
        fraseAlvoRef.current = fraseAtual;

        setStatusVoz('RECORDING');
        setEstaOuvindo(true);
        estaGravandoRef.current = true;
        animarVolumeOnda();
        processandoAcertoRef.current = false;
        setTranscricaoAoVivo("");

        const recognition = new SpeechRecognition();
        window.recognitionInstance = recognition;
        recognition.lang = temas[idiomaEstudo]?.langCode || 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event) => {
            if (processandoAcertoRef.current) return;
            let transcriptAcumulada = "";
            for (let i = 0; i < event.results.length; i++) {
                transcriptAcumulada += event.results[i][0].transcript;
            }

            const falaAtual = transcriptAcumulada.toLowerCase().trim();
            setTranscricaoAoVivo(falaAtual);

            const normalizar = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()[\]\\-—…，。！？；：、]/g, "").replace(/\s+/g, " ").trim();

            const fraseAlvo = fraseAlvoRef.current || fraseAtual;
            const fraseOriginal = fraseAlvo ? fraseAlvo[idiomaEstudo] : "";
            const textoAlvo = (idiomaEstudo === 'pi' && fraseAlvo?.zh) ? fraseAlvo.zh : fraseOriginal;
            const fraseCorreta = normalizar(textoAlvo);

            const falaComparacao = normalizar(falaAtual);
            const palavrasCorretas = idiomaEstudo === 'pi' ? textoAlvo.split("") : fraseCorreta.split(" ");
            const acertos = palavrasCorretas.filter(p => falaComparacao.includes(normalizar(p))).length;
            const percentualAcerto = acertos / Math.max(1, palavrasCorretas.length);

            const limiar = palavrasCorretas.length <= 2 ? 0.5 : palavrasCorretas.length <= 4 ? 0.65 : 0.75;

            if (percentualAcerto >= limiar || falaComparacao.includes(fraseCorreta)) {
                if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);
                if (processandoAcertoRef.current) return;
                processandoAcertoRef.current = true;

                try { recognition.stop(); } catch (e) { }

                setTimeout(() => {
                    setStatusVoz('IDLE');
                    setEstaOuvindo(false);
                    pararMonitoramentoAudio();

                    if (onAvaliacaoConcluida) {
                        onAvaliacaoConcluida({
                            resultado: 'acerto',
                            tentativas: tentativasVozRef.current,
                            fraseOriginal: fraseOriginal,
                            fraseObj: fraseAlvo
                        });
                    }
                }, 800);
            } else {
                if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);
                timerSilencioRef.current = setTimeout(() => {
                    if (!processandoAcertoRef.current && falaAtual.length > 0) {
                        processandoAcertoRef.current = true;
                        tentativasVozRef.current += 1;
                        try { recognition.stop(); } catch (e) { }
                        setStatusVoz('IDLE');
                        setEstaOuvindo(false);
                        pararMonitoramentoAudio();

                        if (onAvaliacaoConcluida) {
                            onAvaliacaoConcluida({
                                resultado: 'erro',
                                tentativas: tentativasVozRef.current,
                                fraseOriginal: fraseOriginal,
                                fraseObj: fraseAlvo
                            });
                        }
                    }
                }, 2200);
            }
        };

        recognition.onerror = () => {
            setStatusVoz('IDLE');
            setEstaOuvindo(false);
            pararMonitoramentoAudio();
        };

        recognition.onend = () => {
            setStatusVoz('IDLE');
            setEstaOuvindo(false);
            pararMonitoramentoAudio();
        };

        setTimeout(() => {
            try { recognition.start(); } catch (e) { }
        }, 100);
    };

    return {
        estaOuvindo,
        statusVoz,
        transcricaoAoVivo,
        volume,
        falar,
        iniciarReconhecimentoVoz,
        pararMonitoramentoAudio,
        setEstaOuvindo,
        setStatusVoz,
        setTranscricaoAoVivo
    };
};
