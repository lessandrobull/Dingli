import { useState, useCallback } from 'react';

export const useAI = ({ idiomaOrigem, idiomaEstudo, nivelAtivo, temas, apiKey, mudarTela }) => {
    const [aiLoading, setAiLoading] = useState(false);
    const [aiExplanation, setAiExplanation] = useState(null);

    const explicarFraseIA = useCallback(async (itemFrase) => {
        const fraseOriginal = typeof itemFrase === 'string'
            ? itemFrase
            : (itemFrase?.[idiomaEstudo] || itemFrase?.en || "");
        if (mudarTela) mudarTela('explicacaoIA');
        setAiLoading(true);
        setAiExplanation(null);

        const nomeOrigem = temas[idiomaOrigem]?.label || "Português";
        const nomeEstudo = temas[idiomaOrigem]?.nomes?.[idiomaEstudo] || "Língua Estrangeira";

        // Sub-etapa 7.2: Prompt Engineering centralizado no Hook
        const systemPrompt = `Você é um tutor de idiomas sênior. 
        Sua tarefa é explicar frases para alunos de nível ${nivelAtivo}.
        A explicação deve ser escrita em ${nomeOrigem}.
        Responda APENAS com JSON puro seguindo exatamente este esquema:
        {
          "translation": "Tradução fluida da frase",
          "explanation": "Explicação gramatical breve e simples",
          "breakdown": [{"word": "palavra", "meaning": "significado"}]
        }`;

        const userQuery = `Analise a frase em ${nomeEstudo}: "${fraseOriginal}".`;

        const realizarChamada = async (tentativa = 0) => {
            try {

                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: userQuery }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        generationConfig: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: "OBJECT",
                                properties: {
                                    translation: { type: "STRING" },
                                    explanation: { type: "STRING" },
                                    breakdown: {
                                        type: "ARRAY",
                                        items: {
                                            type: "OBJECT",
                                            properties: {
                                                word: { type: "STRING" },
                                                meaning: { type: "STRING" }
                                            },
                                            required: ["word", "meaning"]
                                        }
                                    }
                                },
                                required: ["translation", "explanation", "breakdown"]
                            }
                        }
                    })
                });

                if (!response.ok) throw new Error(`Erro na API: ${response.status}`);

                const result = await response.json();
                const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!rawText) throw new Error("A IA não gerou conteúdo.");

                const dados = JSON.parse(rawText.replace(/```json|```/g, "").trim());

                setAiExplanation(dados);
                setAiLoading(false);

            } catch (err) {
                if (tentativa < 4) {
                    const atraso = Math.pow(2, tentativa) * 1000;
                    setTimeout(() => realizarChamada(tentativa + 1), atraso);
                } else {
                    setAiExplanation({ isError: true, message: "Não foi possível carregar a explicação." });
                    setAiLoading(false);
                }
            }
        };

        realizarChamada();
    }, [idiomaOrigem, idiomaEstudo, nivelAtivo, temas, apiKey, mudarTela]);
    return { aiLoading, aiExplanation, explicarFraseIA };
};