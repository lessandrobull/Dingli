import React from 'react';

/**
 * Componente de Perfil do utilizador.
 * Exibe o progresso, cursos ativos e opções de administração.
 */
import { useDingli } from '../DingliContext';

export default function Perfil({
  styles,
  nomeAluno,
  fraseTeorica,
  setFrasesMaestria,
  setSessaoDominium,
  cursosInscritos
}) {

  const { temas, mudarTela, setIdiomaOrigem, setIdiomaEstudo, setUserRole } = useDingli();
  // Verificação de segurança: se as props essenciais (styles ou temas) forem undefined,
  // evitamos o crash da aplicação retornando null enquanto os dados carregam.
  if (!styles || !temas) {
    console.warn("Perfil: 'styles' ou 'temas' não foram fornecidos.");
    return null;
  }

  return (
    <div style={{ ...styles.viewport, backgroundColor: '#e4eafa' }}>
      <div style={styles.mobileContainer}>
        {/* Cabeçalho do Perfil */}
        <div style={{ ...styles.topoPerfil, flexDirection: 'column', alignItems: 'center' }}>
          <img src="/assets/logos/dingli_logo_perfil.png
          " alt="DìNGLì Logo" style={{ width: '100%', height: '140px', objectFit: 'contain', marginBottom: '5px', marginTop: '5px' }} />
          <h2 style={{ ...styles.nomeAluno, color: '#2a537f', margin: '0' }}>Olá, {nomeAluno || 'Estudante'}</h2>
        </div>

        {/* Quadro de Frase Motivacional */}
        <div style={{ ...styles.quadroFrase, backgroundColor: '#e4eafa', border: 'none', boxShadow: 'none', marginBottom: '-20px', marginTop: '-10px' }}>
          <p style={{ ...styles.textoFrase, color: '#296bc2' }}>{fraseTeorica || 'A carregar inspiração...'}</p>
        </div>
        {/* Secção de Cursos */}
        <div style={styles.secaoCursos}>
          <button
            style={{ ...styles.btnAdicionarMinimal, backgroundColor: '#e4eafa', color: '#296bc2' }}
            onClick={() => {
              setUserRole('aluno');
              mudarTela('escolherOrigem');
            }}
          >
            + Adicionar novo idioma
          </button>
          <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', width: '100%', marginBottom: '0px' }}>
            <div style={styles.gridCursos}>
              {/* Mapeamento dinâmico dos cursos ativos */}
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
                      mudarTela('menuCurso');
                    }}
                  >
                    {temas[curso.origem]?.nomes?.[curso.estudo] || curso.nomeEstudo}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, paddingBottom: '0px' }}>
          {/* Botões de Controlo e Administração */}
          <button
            style={{ ...styles.btnLabHome, margin: '0 auto', display: 'block', width: '100%', backgroundColor: '#e4eafa' }}
            onClick={() => {
              setUserRole('adm');
              mudarTela('adm');
            }}
          >
            <span style={{ ...styles.labDestaque, color: '#296bc2' }}>Adm</span>
          </button>
        </div>
      </div>
    </div>
  );
}