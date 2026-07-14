import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  rotulo: string;
  valor: number;
  href: string;
  destaque?: boolean;
}

/** Card de indicador clicável que leva para uma listagem filtrada. */
export function StatCard({ rotulo, valor, href, destaque }: StatCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-brand-300 hover:bg-brand-50/40">
        <CardContent className="p-4">
          <p className="text-xs text-gray-500">{rotulo}</p>
          <p
            className={
              "mt-1 text-2xl font-bold " +
              (destaque && valor > 0 ? "text-red-600" : "text-gray-900")
            }
          >
            {valor}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
