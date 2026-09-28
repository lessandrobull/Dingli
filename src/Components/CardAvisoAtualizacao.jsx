import React, { useState, useEffect } from 'react';
import { useDingli } from '../DingliContext';
import { styles as defaultStyles } from '../styles';

const TEXTOS_AVISO = {
  pt: {
    topicoLabel: "Atualização de Conteúdo",
    titulo: "Conteúdo Aprimorado!",
    mensagemGeral: "Revisamos o curso e aprimoramos o conteúdo para que sua experiência de aprendizado seja ainda mais natural e precisa.",
    mensagemFrases: (qtd) => qtd > 1 ? `${qtd} frases que você já estudou foram atualizadas com novas pronúncias ou ajustes de escrita.` : `${qtd} frase que você já estudou foi atualizada com novas pronúncias ou ajustes de escrita.`,
    mensagemCiclo: "Para garantir que você domine a nova versão, essas frases foram recolocadas no início do seu ciclo de prática.",
    botaoAcao: "Atualizar e Praticar",
    baixando: "Atualizando áudios..."
  },
  en: {
    topicoLabel: "Content Update",
    titulo: "Content Improved!",
    mensagemGeral: "We reviewed the course and improved the content to ensure your learning experience is even more natural and accurate.",
    mensagemFrases: (qtd) => qtd > 1 ? `${qtd} sentences you previously studied have been updated with new pronunciations or text refinements.` : `${qtd} sentence you previously studied has been updated with new pronunciations or text refinements.`,
    mensagemCiclo: "To ensure you master the updated version, these sentences were placed back at the beginning of your study cycle.",
    botaoAcao: "Update and Practice",
    baixando: "Updating audio files..."
  },
  es: {
    topicoLabel: "Actualización de Contenido",
    titulo: "¡Contenido Mejorado!",
    mensagemGeral: "Hemos revisado el curso y mejorado el contenido para garantizar que tu experiencia de aprendizaje sea aún más natural y precisa.",
    mensagemFrases: (qtd) => qtd > 1 ? `${qtd} frases que ya habías estudiado han sido actualizadas con nuevas pronunciaciones o ajustes de texto.` : `${qtd} frase que ya habías estudiado ha sido actualizada con nuevas pronunciaciones o ajustes de texto.`,
    mensagemCiclo: "Para asegurarte de dominar la nueva versión, estas frases han sido reincorporadas al inicio de tu ciclo de práctica.",
    botaoAcao: "Actualizar y Practicar",
    baixando: "Actualizando audios..."
  },
  fr: {
    topicoLabel: "Mise à Jour du Contenu",
    titulo: "Contenu Amélioré !",
    mensagemGeral: "Nous avons révisé le cours et amélioré le contenu pour rendre votre expérience d'apprentissage encore plus naturelle et précise.",
    mensagemFrases: (qtd) => qtd > 1 ? `${qtd} phrases déjà étudiées ont été mises à jour avec de nouveaux enregistrements audio ou ajustements de texte.` : `${qtd} phrase déjà étudiée a été mise à jour avec de nouveaux enregistrements audio ou ajustements de texte.`,
    mensagemCiclo: "Pour vous permettre de bien assimiler la nouvelle version, ces phrases ont été replacées au début de votre cycle d'étude.",
    botaoAcao: "Mettre à jour et Pratiquer",
    baixando: "Mise à jour des audios..."
  },
  it: {
    topicoLabel: "Aggiornamento Contenuti",
    titulo: "Contenuto Migliorato!",
    mensagemGeral: "Abbiamo revisionato il corso e migliorato il materiale per garantire un'esperienza di studio ancora più fluida e accurata.",
    mensagemFrases: (qtd) => qtd > 1 ? `${qtd} frasi che hai già studiato sono state aggiornate con nuovi audio o rifiniture del testo.` : `${qtd} frase che hai già studiato è stata aggiornata con nuovi audio o rifiniture del testo.`,
    mensagemCiclo: "Per permetterti di padroneggiare la nuova versione, queste frasi sono state riposizionate all'inizio del tuo ciclo di pratica.",
    botaoAcao: "Aggiorna e Pratica",
    baixando: "Aggiornamento audio..."
  },
  ge: {
    topicoLabel: "Inhaltsaktualisierung",
    titulo: "Verbesserter Inhalt!",
    mensagemGeral: "Wir haben den Kurs überarbeitet und optimiert, um Ihr Lernerlebnis noch natürlicher und präziser zu gestalten.",
    mensagemFrases: (qtd) => qtd > 1 ? `${qtd} Sätze, die Sie bereits gelernt haben, wurden mit neuen Audios oder Textanpassungen aktualisiert.` : `${qtd} Satz, den Sie bereits gelernt haben, wurde mit neuen Audios oder Textanpassungen aktualisiert.`,
    mensagemCiclo: "Damit Sie die neue Version sicher beherrschen, wurden diese Sätze an den Anfang Ihres Lernzyklus verschoben.",
    botaoAcao: "Aktualisieren und Üben",
    baixando: "Audios werden aktualisiert..."
  },
  pi: {
    topicoLabel: "内容更新 (Nèiróng gēngxīn)",
    titulo: "内容已优化！(Nèiróng yǐ yōuhuà!)",
    mensagemGeral: "我们对课程内容进行了全面修订与优化，以提供更加纯正的发音和更精准的语言表达。",
    mensagemFrases: (qtd) => `您之前学过的 ${qtd} 个句子已更新了全新音频或文本校正。`,
    mensagemCiclo: "为了帮助您完全掌握最新版本，这些句子已重新置于您当前练习周期的首位。",
    botaoAcao: "更新并练习 (Gēngxīn bìng liànxí)",
    baixando: "正在更新音频... (Zhèngzài gēngxīn yīnpín...)"
  }
};

export default function CardAvisoAtualizacao({
  styles = defaultStyles,
  descricao = "",
  quantidadeFrases = 0,
  onConfirmar,
  onFechar
}) {
  const { temas, t, navStyle, idiomaEstudo, idiomaOrigem, mudarTela } = useDingli();
  const ns = navStyle(idiomaEstudo);

  const [alturaTela, setAlturaTela] = useState(window.innerHeight);
  const [emAndamento, setEmAndamento] = useState(false);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const handleResize = () => setAlturaTela(window.visualViewport?.height || window.innerHeight);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const textos = TEXTOS_AVISO[idiomaOrigem] || TEXTOS_AVISO.pt;
  const corTema = temas[idiomaEstudo]?.bg || "#4f46e5";

  const handleSair = () => {
    if (emAndamento) return;
    if (onFechar) {
      onFechar();
    } else {
      mudarTela('menuCartoes');
    }
  };

  const handleAtualizar = async () => {
    if (emAndamento) return;
    setEmAndamento(true);
    setProgresso(0);

    try {
      if (onConfirmar) {
        await onConfirmar((p) => {
          const valor = typeof p === 'object' && p !== null ? p.percentual : p;
          setProgresso(valor || 0);
        });
      }
    } catch (err) {
      console.error("[CardAvisoAtualizacao] Erro ao aplicar atualização:", err);
      setEmAndamento(false);
    }
  };

  return (
    <div style={{ ...styles.viewport, backgroundColor: corTema, height: alturaTela, position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 9999 }}>
      <div style={{ ...styles.mobileContainer, justifyContent: 'flex-start' }}>
        {/* Botão de saída no topo com a mesma estrutura de TelaEstudo */}
        <button
          type="button"
          onClick={handleSair}
          disabled={emAndamento}
          style={{
            ...styles.btnNavTopo,
            backgroundColor: ns.bg,
            color: ns.txt,
            opacity: emAndamento ? 0.5 : 1,
            cursor: emAndamento ? 'not-allowed' : 'pointer'
          }}
        >
          ← {t?.quit || "Sair"}
        </button>

        {/* Card central idêntico ao de TelaEstudo */}
        <div style={{ ...styles.cardFixoRelativo, position: 'relative', margin: '0 auto', outline: 'none' }}>
          
          {/* Topo do Card */}
          <div style={styles.topCardAreaFixed}>
            <p style={{ ...styles.labelTopico, color: corTema, margin: '0 0 10px 0' }}>
              {textos.topicoLabel}
            </p>
          </div>

          {/* Área Central Informativa */}
          <div style={{ ...styles.areaFraseCentralFlex, flex: 1, padding: '10px 15px', overflowY: 'auto', textAlign: 'center' }}>
            
            {/* Ícone de atualização em SVG nativo */}
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: `${corTema}15`,
              color: corTema,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
            </div>

            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '1.35rem',
              fontWeight: '900',
              color: '#1e293b'
            }}>
              {textos.titulo}
            </h2>

            <p style={{
              margin: '0 0 14px 0',
              fontSize: '0.92rem',
              color: '#475569',
              lineHeight: '1.45'
            }}>
              {textos.mensagemGeral}
            </p>

            {quantidadeFrases > 0 && (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                margin: '0 0 14px 0',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                <p style={{
                  margin: '0 0 6px 0',
                  fontSize: '0.95rem',
                  fontWeight: '800',
                  color: corTema
                }}>
                  {textos.mensagemFrases(quantidadeFrases)}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '0.85rem',
                  color: '#64748b',
                  lineHeight: '1.4'
                }}>
                  {textos.mensagemCiclo}
                </p>
              </div>
            )}

            {descricao && (
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '0.8rem',
                color: '#94a3b8',
                fontStyle: 'italic'
              }}>
                {descricao}
              </p>
            )}
          </div>

          {/* Área Inferior com Botão e Barra de Progresso */}
          <div style={{ ...styles.bottomCardAreaFixed, gap: '8px', paddingTop: '10px' }}>
            <button
              type="button"
              disabled={emAndamento}
              onClick={handleAtualizar}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: ns.bg,
                color: ns.txt,
                fontSize: "1rem",
                fontWeight: "800",
                cursor: emAndamento ? 'not-allowed' : 'pointer',
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "opacity 0.2s"
              }}
            >
              {emAndamento ? `${textos.baixando} ${progresso}%` : textos.botaoAcao}
            </button>

            {/* Barra de Progresso Dinâmica */}
            {emAndamento && (
              <div style={{
                width: '100%',
                height: '6px',
                backgroundColor: '#e2e8f0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progresso}%`,
                  height: '100%',
                  backgroundColor: corTema,
                  transition: 'width 0.2s ease'
                }} />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
