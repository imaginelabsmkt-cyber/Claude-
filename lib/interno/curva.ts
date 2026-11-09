/** Um ponto já convertido para coordenada de tela. */
export interface Ponto {
  x: number;
  y: number;
}

/**
 * Caminho SVG de uma linha suave que passa por todos os pontos.
 *
 * Usa cúbica monotônica (Fritsch e Carlson, 1980), e não a curva
 * "bonitinha" padrão, por um motivo que é de dado e não de desenho: a
 * suavização ingênua ULTRAPASSA os pontos. Num gráfico de caixa isso
 * desenha um fundo que a empresa nunca teve, entre dois meses em que
 * ela só caiu. A monotônica garante que, entre dois pontos, a curva
 * nunca sai do intervalo deles: ela só suaviza o traço, nunca inventa
 * um valor.
 */
export function curvaSuave(pontos: Ponto[]): string {
  if (pontos.length === 0) return "";
  if (pontos.length === 1) return `M${pontos[0].x} ${pontos[0].y}`;
  if (pontos.length === 2) {
    return `M${pontos[0].x} ${pontos[0].y} L${pontos[1].x} ${pontos[1].y}`;
  }

  const n = pontos.length;

  // Inclinação de cada trecho.
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = pontos[i + 1].x - pontos[i].x;
    delta.push(dx === 0 ? 0 : (pontos[i + 1].y - pontos[i].y) / dx);
  }

  // Inclinação em cada ponto: a média dos dois trechos vizinhos.
  const m: number[] = [delta[0]];
  for (let i = 1; i < n - 1; i += 1) {
    m.push(
      delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2,
    );
  }
  m.push(delta[n - 2]);

  // O passo que impede o excesso: onde a inclinação do ponto é grande
  // demais para o trecho, ela é encolhida até caber.
  for (let i = 0; i < n - 1; i += 1) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }

  let d = `M${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const dx = pontos[i + 1].x - pontos[i].x;
    const c1x = pontos[i].x + dx / 3;
    const c1y = pontos[i].y + (m[i] * dx) / 3;
    const c2x = pontos[i + 1].x - dx / 3;
    const c2y = pontos[i + 1].y - (m[i + 1] * dx) / 3;
    d += ` C${arred(c1x)} ${arred(c1y)} ${arred(c2x)} ${arred(c2y)} ${arred(pontos[i + 1].x)} ${arred(pontos[i + 1].y)}`;
  }
  return d;
}

/** Duas casas bastam para coordenada de tela; o resto é peso no HTML. */
function arred(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Os pontos de controle de cada trecho, para o teste conferir que a
 * curva não ultrapassa os pontos. Mesma conta de `curvaSuave`.
 */
export function controlesDaCurva(
  pontos: Ponto[],
): { c1: Ponto; c2: Ponto }[] {
  const d = curvaSuave(pontos);
  const trechos = d.split("C").slice(1);
  return trechos.map((t) => {
    const n = t.trim().split(/[\s]+/).map(Number);
    return { c1: { x: n[0], y: n[1] }, c2: { x: n[2], y: n[3] } };
  });
}
