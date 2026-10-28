import React, { useRef, useEffect, useState } from 'react';
import { useDingli } from '../DingliContext';
import { COR_TOM_CLARO, COR_INSTITUCIONAL_TITULO, COR_INSTITUCIONAL_ACAO, COR_SUPERFICIE_DIGITACAO } from '../themeColors';
import { supabase } from '../supabaseClient';

export default function Perfil({
  styles,
  nomeAluno,
  fraseTeorica,
  setFrasesMaestria,
  setSessaoDominium,
  cursosInscritos
}) {
  const { temas, mudarTela, setIdiomaOrigem, setIdiomaEstudo, setUserRole, setNivelAtivo, nivelAtivo } = useDingli();

  const [modalLoginAberto, setModalLoginAberto] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const toquesRef = useRef(0);
  const timerToquesRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerToquesRef.current) clearTimeout(timerToquesRef.current);
    };
  }, []);

  const handleToqueFrase = () => {
    toquesRef.current += 1;
    if (timerToquesRef.current) clearTimeout(timerToquesRef.current);

    if (toquesRef.current >= 4) {
      toquesRef.current = 0;
      setModalLoginAberto(true);
      return;
    }

    timerToquesRef.current = setTimeout(() => {
      toquesRef.current = 0;
    }, 1500);
  };

  const handleLogin = async () => {
    if (!email || !senha) {
      alert('Preencha o e-mail e a senha.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert('Falha no login: ' + error.message);
      return;
    }

    setModalLoginAberto(false);
    setUserRole('adm');
    mudarTela('adm');
  };

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

        <div onClick={handleToqueFrase} style={{ ...styles.quadroFrase, backgroundColor: COR_TOM_CLARO, border: 'none', boxShadow: 'none', marginBottom: '-20px', marginTop: '-10px' }}>
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

        {import.meta.env.DEV && (
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0, paddingBottom: '0px' }}>
            <button
              style={{ ...styles.btnLabHome, margin: '0 auto', display: 'block', width: '100%', backgroundColor: COR_TOM_CLARO }}
              onClick={() => {
                setModalLoginAberto(true);
              }}
            >
              <span style={{ ...styles.labDestaque, color: COR_INSTITUCIONAL_ACAO }}>Adm</span>
            </button>
          </div>
        )}

        {modalLoginAberto && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100dvh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: 0, color: COR_INSTITUCIONAL_TITULO, textAlign: 'center' }}>
                Acesso Adm
              </h3>

              <input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />

              <input
                type="password"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setModalLoginAberto(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  id="btnConfirmarLogin"
                  onClick={handleLogin}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: COR_INSTITUCIONAL_ACAO,
                    color: '#ffffff',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}