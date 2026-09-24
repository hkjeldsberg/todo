export default function Setup({ error }: { error?: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-[480px] flex-col justify-center gap-4 px-6">
      <h1 className="text-[22px] font-bold">todo needs a database</h1>
      <p className="text-[15px] text-muted">
        Create a Supabase project, run{" "}
        <code className="rounded bg-pill px-1">
          app/supabase/migrations/*.sql
        </code>{" "}
        in the SQL editor, then add <code>todo</code> to{" "}
        <em>Settings → API → Exposed schemas</em>.
      </p>
      <pre className="overflow-x-auto rounded-[18px] bg-card p-3 text-[12px] leading-relaxed">
        {`# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ANTHROPIC_API_KEY=<anthropic-key>`}
      </pre>
      <p className="text-[15px] text-muted">Restart the dev server after saving.</p>
      {error && (
        <p className="text-[14px] font-bold text-accent" role="alert">
          ! {error}
        </p>
      )}
    </main>
  );
}
