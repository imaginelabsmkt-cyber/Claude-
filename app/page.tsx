import { redirect } from "next/navigation";

/**
 * Rota raiz. A decisão real (dashboard x login) é feita pelo middleware
 * conforme a sessão. Aqui apenas encaminhamos para /dashboard.
 */
export default function HomePage() {
  redirect("/dashboard");
}
