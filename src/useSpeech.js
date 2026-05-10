import { useState, useRef, useCallback, useEffect } from 'react';

export const useSpeech = ({
    idiomaEstudo,
    temas,
    frasesFiltradas,
    indice,
    onAvaliacaoConcluida
}) => {
    const [estaOuvindo, setEstaOuvindo] = useState(false);
    const [statusVoz, setStatusVoz] = useState('IDLE');
    const [transcricaoAoVivo, setTranscricaoAoVivo] = useState("");
    const [volume, setVolume] = useState(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const animationFrameRef = useRef(null);
    const timerSilencioRef = useRef(null);
    const voiceIndex = useRef(0);
    const tentativasVozRef = useRef(0);
    const processandoAcertoRef = useRef(false);
    useEffect(() => {
        tentativasVozRef.current = 0;
    }, [indice]);
    const falar = useCallback((texto, lento, callback) => {
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
                const palavras = palavrasBrutas.filter(p => !/^[.,!?;:，。！？；：]+$/.test(p.trim()) && p.trim() !== ""); const falarPalavra = (index) => {
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

    const pararMonitoramentoAudio = useCallback(() => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
            try { audioContextRef.current.close(); } catch (e) { }
        }
        audioContextRef.current = null;
        analyserRef.current = null;
        setVolume(0);
    }, []);

    const iniciarMonitoramentoAudio = async () => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContextClass();
            audioContextRef.current = ctx;

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const analyser = ctx.createAnalyser();
            analyserRef.current = analyser;
            analyser.fftSize = 32;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const atualizarVolume = () => {
                if (!analyserRef.current) return;
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                setVolume(average * 6.0);
                animationFrameRef.current = requestAnimationFrame(atualizarVolume);
            };
            atualizarVolume();
        } catch (err) {
            console.error("Erro microfone:", err);
        }
    };

    const iniciarReconhecimentoVoz = () => {
        if (statusVoz !== 'IDLE') return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        setStatusVoz('RECORDING');
        setEstaOuvindo(true);
        iniciarMonitoramentoAudio();
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
            for (let i = 0; i < event.results.length; i++) transcriptAcumulada += event.results[i][0].transcript;

            const falaAtual = transcriptAcumulada.toLowerCase().trim();
            setTranscricaoAoVivo(falaAtual);

            const normalizar = (t) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g, "ss").toLowerCase().replace(/[.,!?;:¿¡"'{}()[\]\\-—…，。！？；：、]/g, "").replace(/\s+/g, " ").trim();

            const fraseOriginal = frasesFiltradas[indice][idiomaEstudo];
            const textoAlvo = (idiomaEstudo === 'pi' && frasesFiltradas[indice].zh) ? frasesFiltradas[indice].zh : fraseOriginal;
            const fraseCorreta = normalizar(textoAlvo);

            const falaComparacao = normalizar(falaAtual);
            const palavrasCorretas = idiomaEstudo === 'pi' ? textoAlvo.split("") : fraseCorreta.split(" ");
            const acertos = palavrasCorretas.filter(p => falaComparacao.includes(normalizar(p))).length;
            const percentualAcerto = acertos / palavrasCorretas.length;
            if (percentualAcerto >= 0.85 || falaComparacao.includes(fraseCorreta)) {
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
                            fraseOriginal: fraseOriginal
                        });
                    }
                }, 1000);
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
                                fraseOriginal: fraseOriginal
                            });
                        }
                    }
                }, 2000);
            }
        };

        recognition.onend = () => {
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