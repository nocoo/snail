import { Button, LayerCard, Separator } from "@nocoo/basalt";
import { ShieldCheck } from "lucide-react";
import { BrandMark } from "../components/brand";

export function SignInPage({ error }: { error: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-basalt-background p-4">
      <LayerCard className="flex aspect-[54/86] w-72 flex-col rounded-2xl shadow-xl" outlined>
        <LayerCard.Header className="items-center bg-basalt-primary px-5 py-4 text-basalt-primary-foreground">
          <span
            className="h-3 w-7 rounded-full bg-basalt-primary-foreground/30"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold">Snail</span>
          <span className="text-[10px]">访客</span>
        </LayerCard.Header>
        <LayerCard.Body className="flex flex-1 flex-col items-center gap-4 px-6 py-6 text-center">
          <BrandMark size={64} />
          <h1 className="text-lg font-semibold">你的私人视频库</h1>
          <p className="text-sm text-basalt-muted-foreground" role="alert">
            {error}
          </p>
          <Separator />
          <Button className="mt-auto w-full" asChild>
            <a href="/cdn-cgi/access/login?redirect_url=%2F">登录 Snail</a>
          </Button>
        </LayerCard.Body>
        <LayerCard.Footer className="justify-center text-xs text-basalt-muted-foreground">
          <ShieldCheck className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          安全登录
        </LayerCard.Footer>
      </LayerCard>
    </main>
  );
}
