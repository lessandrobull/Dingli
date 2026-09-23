import { useState, useRef, useCallback, useEffect } from 'react';
import { obterAudioUrl, VOZES_EN, VOZES_ES, VOZES_FR, VOZES_IT, VOZES_GE, VOZES_PT, VOZES_ZH } from './services/audioCacheService';

// TABELA CENTRAL DE VELOCIDADES DE ÁUDIO (Ajuste manual por idioma)
export const VELOCIDADES_AUDIO = {
    pi: { normal: 0.85, lento: 0.50 }, // Mandarim
    zh: { normal: 0.85, lento: 0.50 },
    en: { normal: 1.00, lento: 0.65 }, // Inglês
    es: { normal: 1.00, lento: 0.65 }, // Espanhol
    fr: { normal: 1.00, lento: 0.65 }, // Francês
    it: { normal: 1.00, lento: 0.65 }, // Italiano
    ge: { normal: 1.00, lento: 0.65 }, // Alemão
    pt: { normal: 1.00, lento: 0.65 }  // Português
};

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
    const [vozAtiva, setVozAtiva] = useState(null);

    const animationFrameRef = useRef(null);
    const timerSilencioRef = useRef(null);
    const voiceIndex = useRef(0);

    // Controle do sorteio sem repetição e retenção de voz
    const filaVozesRef = useRef([]);
    const vozAtualRef = useRef(null);

    const audioRef = useRef(null);
    const tentativasVozRef = useRef(0);
    const processandoAcertoRef = useRef(false);
    const estaGravandoRef = useRef(false);
    const falaRef = useRef("");
    const fraseAlvoRef = useRef(null);
    const playRequestIdRef = useRef(0);

    // Mapeamento das listas de vozes por idioma
    const obterListaVozesIdioma = useCallback((lang) => {
        if (lang === 'pi' || lang === 'zh') return VOZES_ZH;
        if (lang === 'pt') return VOZES_PT;
        if (lang === 'ge') return VOZES_GE;
        if (lang === 'it') return VOZES_IT;
        if (lang === 'fr') return VOZES_FR;
        if (lang === 'es') return VOZES_ES;
        return VOZES_EN;
    }, []);

    // Algoritmo Fisher-Yates para embaralhamento puro
    const embaralharArray = (array) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    };

    // Sorteador sem repetição que reembaralha ao esgotar o ciclo
    const obterProximaVoz = useCallback((lang) => {
        const listaBase = obterListaVozesIdioma(lang);
        if (!filaVozesRef.current || filaVozesRef.current.length === 0) {
            let novoSorteio = embaralharArray(listaBase);
            // Evita repetir a mesma voz imediatamente na virada de ciclo (se houver mais de 1)
            if (novoSorteio.length > 1 && novoSorteio[0] === vozAtualRef.current) {
                const swapIdx = Math.floor(Math.random() * (novoSorteio.length - 1)) + 1;
                [novoSorteio[0], novoSorteio[swapIdx]] = [novoSorteio[swapIdx], novoSorteio[0]];
            }
            filaVozesRef.current = novoSorteio;
        }
        const vozSorteada = filaVozesRef.current.shift();
        vozAtualRef.current = vozSorteada;
        setVozAtiva(vozSorteada);
        return vozSorteada;
    }, [obterListaVozesIdioma]);

    // Reseta estado transitório na mudança de frase ou idioma
    useEffect(() => {
        tentativasVozRef.current = 0;
        vozAtualRef.current = null;
        setVozAtiva(null);
    }, [indice]);

    useEffect(() => {
        filaVozesRef.current = [];
        vozAtualRef.current = null;
        setVozAtiva(null);
    }, [idiomaEstudo]);

    const pararAudiosEmExecucao = useCallback(() => {
        playRequestIdRef.current += 1;
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.src = "";
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
            // Só avança a voz de síntese se não for repetição lenta
            if (!lento && voices.length > 0) voiceIndex.current += 1;

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
        const currentRequestId = playRequestIdRef.current;

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

        // Se for idioma com storage de áudio e tiver ID, reproduz o MP3 pré-gerado
        if (['en', 'es', 'fr', 'it', 'ge', 'pt', 'pi'].includes(idiomaEstudo) && id) {
            try {
                let voz = null;

                if (typeof alvo === 'object' && alvo !== null && alvo.voz) {
                    // Voz explicitamente indicada
                    voz = alvo.voz;
                    vozAtualRef.current = voz;
                    setVozAtiva(voz);
                } else if (lento && vozAtualRef.current) {
                    // 1.1: Repetição lenta reutiliza exatamente a mesma voz
                    voz = vozAtualRef.current;
                } else {
                    // 1.2: Reprodução normal consome do sorteio sem repetição
                    voz = obterProximaVoz(idiomaEstudo);
                }

                const url = await obterAudioUrl(id, voz, idiomaEstudo);

                const audio = new Audio(url);
                audioRef.current = audio;

                const cfgVel = VELOCIDADES_AUDIO[idiomaEstudo] || { normal: 1.0, lento: 0.75 };
                audio.playbackRate = lento ? cfgVel.lento : cfgVel.normal;

                audio.onended = () => {
                    audioRef.current = null;
                    if (callback) callback();
                };

                audio.onerror = (err) => {
                    console.warn(`[useSpeech] Falha ao reproduzir MP3 (${id}_${voz}), usando TTS:`, err);
                    audioRef.current = null;
                    falarTTS(texto, lento, callback);
                };

                if (currentRequestId !== playRequestIdRef.current) return;

                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch((e) => {
                        if (e.name === "AbortError" || currentRequestId !== playRequestIdRef.current) return;
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

        // Fallback nativo
        falarTTS(texto, lento, callback);
    }, [idiomaEstudo, fraseAtiva, frasesFiltradas, indice, pararAudiosEmExecucao, falarTTS, obterProximaVoz]);

    const pararMonitoramentoAudio = useCallback(() => {
        estaGravandoRef.current = false;
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setVolume(0);
    }, []);

    const normalizar = useCallback((t) => {
        return (t || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/ß/g, "ss")
            .toLowerCase()
            .replace(/[.,!?;:¿¡"'{}()[\]\\—…，。！？；：、-]/g, "")
            .replace(/\s+/g, " ")
            .trim();
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
        if (!SpeechRecognition) {
            console.warn("[useSpeech] Reconhecimento de voz não suportado neste navegador.");
            return;
        }

        if (fraseParam) {
            fraseAlvoRef.current = fraseParam;
        }

        tentativasVozRef.current = 0;
        setEstaOuvindo(true);
        setStatusVoz('RECORDING');
        estaGravandoRef.current = true;
        animarVolumeOnda();
        processandoAcertoRef.current = false;
        setTranscricaoAoVivo("");
        falaRef.current = "";

        if (window.recognitionInstance) {
            try { window.recognitionInstance.abort(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        window.recognitionInstance = recognition;
        recognition.lang = temas[idiomaEstudo]?.langCode || 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;

        const dispararConclusao = (resultado, falaTexto, fraseAlvo, fraseOriginal) => {
            if (processandoAcertoRef.current) return;
            processandoAcertoRef.current = true;
            if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);

            setStatusVoz('EVALUATING');
            setEstaOuvindo(false);
            pararMonitoramentoAudio();
            try { recognition.abort(); } catch (e) { }

            setTimeout(() => {
                setStatusVoz('IDLE');
                if (onAvaliacaoConcluida) {
                    onAvaliacaoConcluida({
                        resultado: resultado,
                        tentativas: tentativasVozRef.current,
                        fraseOriginal: fraseOriginal,
                        fraseObj: fraseAlvo
                    });
                }
            }, 250);
        };

        const avaliarAgora = () => {
            if (processandoAcertoRef.current) return;
            const fraseAlvo = fraseAlvoRef.current || frasesFiltradas[indice];
            const fraseOriginal = fraseAlvo ? fraseAlvo[idiomaEstudo] : "";
            const textoAlvo = (idiomaEstudo === 'pi' && fraseAlvo?.zh) ? fraseAlvo.zh : fraseOriginal;
            const fraseCorreta = normalizar(textoAlvo);
            const falaComparacao = normalizar(falaRef.current || "");
            const palavrasCorretas = idiomaEstudo === 'pi' ? textoAlvo.split("") : fraseCorreta.split(" ");

            const acertos = palavrasCorretas.filter(p => {
                const pNorm = normalizar(p);
                return pNorm && falaComparacao.includes(pNorm);
            }).length;

            const percentual = acertos / Math.max(1, palavrasCorretas.length);
            const limiar = palavrasCorretas.length <= 2 ? 0.5 : 0.75;

            if (percentual >= limiar || (fraseCorreta && falaComparacao.includes(fraseCorreta))) {
                dispararConclusao('acerto', falaRef.current, fraseAlvo, fraseOriginal);
            } else {
                tentativasVozRef.current += 1;
                dispararConclusao('erro', falaRef.current, fraseAlvo, fraseOriginal);
            }
        };

        window.dingliPararEAvaliarVoz = avaliarAgora;

        recognition.onresult = (event) => {
            if (processandoAcertoRef.current) return;
            let transcriptAcumulada = "";
            for (let i = 0; i < event.results.length; i++) {
                transcriptAcumulada += (event.results[i][0].transcript || "") + " ";
            }

            const falaAtual = transcriptAcumulada.toLowerCase().trim();
            falaRef.current = falaAtual;
            setTranscricaoAoVivo(falaAtual);

            const fraseAlvo = fraseAlvoRef.current || frasesFiltradas[indice];
            const fraseOriginal = fraseAlvo ? fraseAlvo[idiomaEstudo] : "";
            const textoAlvo = (idiomaEstudo === 'pi' && fraseAlvo?.zh) ? fraseAlvo.zh : fraseOriginal;
            const fraseCorreta = normalizar(textoAlvo);
            const falaComparacao = normalizar(falaAtual);
            const palavrasCorretas = idiomaEstudo === 'pi' ? textoAlvo.split("") : fraseCorreta.split(" ");

            const acertos = palavrasCorretas.filter(p => {
                const pNorm = normalizar(p);
                return pNorm && falaComparacao.includes(pNorm);
            }).length;

            const percentual = acertos / Math.max(1, palavrasCorretas.length);
            const limiar = palavrasCorretas.length <= 2 ? 0.5 : 0.75;

            if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);

            // Acerto automático se atingiu limiar
            if (percentual >= limiar || (fraseCorreta && falaComparacao.includes(fraseCorreta))) {
                timerSilencioRef.current = setTimeout(() => {
                    avaliarAgora();
                }, 750);
            } else {
                // Silêncio de 1.3s para encerrar com erro
                timerSilencioRef.current = setTimeout(() => {
                    if (!processandoAcertoRef.current && falaRef.current) {
                        avaliarAgora();
                    }
                }, 1300);
            }
        };

        recognition.onerror = (e) => {
            console.warn('[useSpeech] Erro microfone:', e.error);
            if (timerSilencioRef.current) clearTimeout(timerSilencioRef.current);
            setStatusVoz('IDLE');
            setEstaOuvindo(false);
            pararMonitoramentoAudio();
        };

        recognition.onend = () => {
            if (statusVoz === 'RECORDING' && !processandoAcertoRef.current) {
                if (falaRef.current) {
                    avaliarAgora();
                } else {
                    setStatusVoz('IDLE');
                    setEstaOuvindo(false);
                    pararMonitoramentoAudio();
                }
            }
        };

        try {
            recognition.start();
        } catch (e) {
            console.warn('[useSpeech] Falha ao iniciar recognition:', e);
            setStatusVoz('IDLE');
            setEstaOuvindo(false);
            pararMonitoramentoAudio();
        }
    };

    return {
        estaOuvindo,
        statusVoz,
        transcricaoAoVivo,
        volume,
        vozAtiva,
        falar,
        iniciarReconhecimentoVoz,
        pararMonitoramentoAudio,
        pararAudiosEmExecucao,
        resetarVozAtual: () => {
            vozAtualRef.current = null;
            setVozAtiva(null);
        },
        pararEAvaliarVoz: () => { if (window.dingliPararEAvaliarVoz) window.dingliPararEAvaliarVoz(); },
        setEstaOuvindo,
        setStatusVoz,
        setTranscricaoAoVivo
    };
};
