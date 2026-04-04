export default function Settings() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-4xl font-extrabold tracking-tight">Configuracoes</h2>
        <p className="text-on-surface-variant">Central de configuracoes operacionais da plataforma CondoGuard.AI.</p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <article className="bg-surface-container-low rounded-xl p-6 space-y-2">
          <h3 className="font-headline font-bold text-xl">Perfil e acesso</h3>
          <p className="text-on-surface-variant text-sm">
            Gerencie preferencias de sessao, notificacoes e politicas de acesso por usuario.
          </p>
        </article>

        <article className="bg-surface-container-low rounded-xl p-6 space-y-2">
          <h3 className="font-headline font-bold text-xl">Integracoes</h3>
          <p className="text-on-surface-variant text-sm">
            Configure ambientes, conectividade de API e parametros de integracao com Oracle.
          </p>
        </article>
      </section>
    </div>
  );
}
