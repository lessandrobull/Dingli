import React from 'react';
import { useDingli } from '../DingliContext';
import { COR_TOM_CLARO, COR_INSTITUCIONAL_TITULO, COR_INSTITUCIONAL_ACAO, COR_SUPERFICIE_DIGITACAO } from '../themeColors';

export default function Perfil({
  styles,
  nomeAluno,
  fraseTeorica,
  setFrasesMaestria,
  setSessaoDominium,
  cursosInscritos
}) {
  const { temas, mudarTela, setIdiomaOrigem, setIdiomaEstudo, setUserRole, setNivelAtivo, nivelAtivo } = useDingli();

  if (!styles || !temas) {
    console.warn("Perfil: 'styles' ou 'temas' não foram fornecidos.");
    return null;
  }

  return (
    <div style={{ ...styles.viewport, backgroundColor: COR_TOM_CLARO }}>
      <div style={styles.mobileContainer}>
        <div style={{ ...styles.topoPerfil, flexDirection: 'column', alignItems: 'center' }}>
          <img src="/assets/logos/dingli_logo_perfil.png" alt="DìNGLì Logo" style={{ width: '100%', height: '140px', objectFit: 'contain', marginBottom: '5px', marginTop: '5px' }} />
          <h2 style={{ ...styles.nomeAluno, color: COR_INSTITUCIONAL_TITULO, margin: '0' }}>Olá, {nomeAluno || 'Estudante'}</h2>
        </div>

        <div style={{ ...styles.quadroFrase, backgroundColor: COR_TOM_CLARO, border: 'none', boxShadow: 'none', marginBottom: '-20px', marginTop: '-10px' }}>
          <p style={{ ...styles.textoFrase, color: COR_INSTITUCIONAL_ACAO }}>{fraseTeorica || 'A carregar inspiração...'}</p>
        </div>

        <div style={styles.secaoCursos}>
          <button
            style={{ ...styles.btnAdicionarMinimal, backgroundColor: COR_TOM_CLARO, color: COR_INSTITUCIONAL_ACAO }}
            onClick={() => {
              setUserRole('aluno');
              mudarTela('escolherOrigem');
            }}
          >
            + Adicionar novo idioma
          </button>
          <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', width: '100%', marginBottom: '0px' }}>
            <div style={styles.gridCursos}>
              {cursosInscritos && cursosInscritos.map((curso, index) => {
                const temaCurso = temas[curso.estudo];
                if (!temaCurso) return null;
                return (
                  <button
                    key={index}
                    style={{
                      ...styles.btnCursoMinimal,
                      backgroundColor: temaCurso.bg,
                      color: temaCurso.btn,
                      marginBottom: '2px'
                    }}
                    onClick={() => {
                      setUserRole('aluno');
                      setIdiomaOrigem(curso.origem);
                      setIdiomaEstudo(curso.estudo);
                      if (setNivelAtivo) setNivelAtivo(curso.nivel || "A1");
                      mudarTela('menuCurso');
                    }}
                  >
                    {`${temas[curso.origem]?.nomes?.[curso.estudo] || curso.nomeEstudo} ${curso.nivel || "A1"}`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, paddingBottom: '0px' }}>
          <button
            style={{ ...styles.btnLabHome, margin: '0 auto', display: 'block', width: '100%', backgroundColor: COR_TOM_CLARO }}
            onClick={() => {
              setUserRole('adm');
              mudarTela('adm');
            }}
          >
            <span style={{ ...styles.labDestaque, color: COR_INSTITUCIONAL_ACAO }}>Adm</span>
          </button>
        </div>
      </div>
    </div>
  );
}