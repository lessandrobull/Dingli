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
    <div style={styles.viewport}>
      <div style={styles.mobileContainer}>
        {/* Cabeçalho do Perfil */}
        <div style={styles.topoPerfil}>
          <h1 style={styles.tituloApp}>DìNGLì</h1>
          <h2 style={styles.nomeAluno}>Olá, {nomeAluno || 'Estudante'}</h2>
        </div>
        {/* Quadro de Frase Motivacional */}
        <div style={styles.quadroFrase}>
          <p style={styles.textoFrase}>{fraseTeorica || 'A carregar inspiração...'}</p>
        </div>
        {/* Secção de Cursos */}
        <div style={styles.secaoCursos}>
          <h3 style={styles.labelCentral}>Cursos em andamento</h3>
          <div className="scroll-container" style={{ flex: 1, overflowY: 'auto', width: '100%', marginBottom: '10px' }}>
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
        {/* Botões Fixos no Rodapé */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, paddingBottom: '20px' }}>
          <button
            style={styles.btnAdicionarMinimal}
            onClick={() => {
              setUserRole('aluno');
              mudarTela('escolherOrigem');
            }}
          >
            + Adicionar novo idioma
          </button>
          {/* Botões de Controlo e Administração */}
          <button
            style={{ ...styles.btnLabHome, margin: '0 auto', display: 'block', width: '100%' }}
            onClick={() => {
              setUserRole('adm');
              mudarTela('adm');
            }}
          >
            <span style={styles.labDestaque}>Adm</span>
          </button>
        </div>
      </div>
    </div>
  );
}