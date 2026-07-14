"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action de logout. Encerra a sessão no Supabase (limpa os cookies)
 * e redireciona para a tela de login.
 */
export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
