"use client";

/**
 * Barreira de erro global (erros no layout raiz). Precisa trazer <html>/<body>
 * porque substitui tudo. Mostra uma mensagem simples em vez de tela branca.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff7ea",
          fontFamily: "system-ui, sans-serif",
          color: "#3a1020",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#7b2340" }}>
            Algo deu errado
          </p>
          <p style={{ marginTop: 8, fontSize: 14, color: "#555" }}>
            Recarregue a página. Se continuar, avise que a gente verifica.
          </p>
          {error.digest ? (
            <p style={{ marginTop: 8, fontSize: 11, color: "#999" }}>
              Código do erro: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              border: "none",
              borderRadius: 8,
              background: "#7b2340",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
