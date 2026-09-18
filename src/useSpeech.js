import { useState, useRef, useCallback, useEffect } from 'react';
import { obterAudioUrl, VOZES_EN } from './services/audioCacheService';

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
    const voiceIndex = useRef(0);
    const voiceNumIndex = useRef(0);
    const audioRef = useRef(null);
    const tentativasVozRef = useRef(0);
    const processandoAcertoRef = useRef(false);
    const estaGravandoRef = useRef(false);
    const fraseAlvoRef = useRef(null);

    useEffect(() => {
        tentativasVozRef.current = 0;
    }, [indice]);

    const pararAudiosEmExecucao = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current = null;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }, []);

    useEffect(() => {
        return () => {
            pararAudiosEmExecucao();
        };
    }, [pararAudiosEmExecucao]);

    const falarTTS = useCallback((texto, lento, callback) => {
        if (!texto) return;
        const synth = window.speechSynthesis;
        synth.cancel();

        setTimeout(() => {
            const voices = synth.getVoices().filter(v => {
                const name = v.name.toLowerCase();
                const lang = temas[idiomaEstudo]?.langCode?.split('-')[0]?.toLowerCase();
                const isQuality = name.includes('natural') || name.includes('neural') || name.includes('premium') || name.includes('online');
                return v.lang.toLowerCase().includes(lang) && (!name.includes('google') || isQuality) && (!name.includes('microsoft') || isQuality);
            });
            const selectedVoice = voices.length > 0 ? voices[voiceIndex.current % voices.length] : null;
            if (voices.length > 0) voiceIndex.current += 1;

            if (lento) {
                const palavrasBrutas = idiomaEstudo === 'pi' && !texto.includes(" ") ? texto.split("") : texto.split(" ");
                const palavras = palavrasBrutas.filter(p => !/^[.,!?;:，。！？；：]+$/.test(p.trim()) && p.trim() !== "");
                const falarPalavra = (index) => {
                    if (index >= palavras.length) {
                        if (callback) callback();
                        window.utterance = null;
                        return;
                    }
                    const msg = new SpeechSynthesisUtterance(palavras[index]);
                    window.utterance = msg;
                    if (selectedVoice) msg.voice = selectedVoice;
                    msg.rate = 0.8;
                    msg.lang = temas[idiomaEstudo]?.langCode || 'en-US';
                    msg.onend = () => {
                        setTimeout(() => falarPalavra(index + 1), 100);
                    };
                    synth.speak(msg);
                };
                synth.resume();
                falarPalavra(0);
            } else {
                const msg = new SpeechSynthesisUtterance(texto);
                window.utterance = msg;
                if (selectedVoice) msg.voice = selectedVoice;
                msg.rate = 0.9;
                msg.lang = temas[idiomaEstudo]?.langCode || 'en-US';
                msg.onend = () => {
                    if (callback) callback();
                    window.utterance = null;
                };
                synth.resume();
                synth.speak(msg);
            }
        }, 50);
    }, [idiomaEstudo, temas]);

    const falar = useCallback(async (alvo, lento = false, callback) => {
        if (!alvo) return;
        pararAudiosEmExecucao();

        let id = null;
        let texto = "";

        if (typeof alvo === 'object' && alvo !== null) {
            id = alvo.id;
            texto = alvo.texto || alvo[idiomaEstudo] || alvo.en || "";
        } else if (typeof alvo === 'string') {
            texto = alvo;
            if (fraseAtiva && fraseAtiva.id) {
                id = fraseAtiva.id;
            } else if (frasesFiltradas && frasesFiltradas[indice] && frasesFiltradas[indice].id) {
                id = frasesFiltradas[indice].id;
            }
        }

        // Se for inglês e tiver ID, reproduz o MP3 pré-gerado
        if (idiomaEstudo === 'en' && id) {
            try {
                const voz = VOZES_EN[voiceNumIndex.current % VOZES_EN.length];
                voiceNumIndex.current += 1;
                const url = await obterAudioUrl(id, voz, 'en');

                const audio = new Audio(url);
                audioRef.current = audio;

                if (lento) {
                    audio.playbackRate = 0.75;
                }

                audio.onended = () => {
                    audioRef.current = null;
                    if (callback) callback();
                };

                audio.onerror = (err) => {
                    console.warn(`[useSpeech] Falha ao reproduzir MP3 (${id}_${voz}), usando TTS:`, err);
                    audioRef.current = null;
                    falarTTS(texto, lento, callback);
                };

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch((e) => {
                        console.warn("[useSpeech] Autoplay bloqueado ou falha de play, usando TTS:", e);
                        audioRef.current = null;
                        falarTTS(texto, lento, callback);
                    });
                }
                return;
            } catch (err) {
                console.warn("[useSpeech] Exceção ao abrir MP3, usando TTS:", err);
                audioRef.current = null;
            }
        }

        // Fallback nativo para outros idiomas ou ausência de ID
        falarTTS(texto, lento, callback);
    }, [idiomaEstudo, fraseAtiva, frasesFiltradas, indice, pararAudiosEmExecucao, falarTTS]);

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

        // Garante que qualquer áudio em reprodução pare imediatamente para não vazar no microfone
        pararAudiosEmExecucao();

        // Vincula a frase exata em foco
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

            // Tolerância dinâmica calibrada por tamanho de frase
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
