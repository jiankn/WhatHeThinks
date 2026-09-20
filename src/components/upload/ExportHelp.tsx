/** "没有文件？"——折叠的 WhatsApp 导出步骤，紧贴上传框放。纯 HTML，无需客户端 JS。 */
export function ExportHelp() {
  return (
    <details className="group mt-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden">
        Don&apos;t have the file? Export it in 30 seconds
        <span className="text-muted transition group-open:rotate-45" aria-hidden>
          +
        </span>
      </summary>
      <div className="mt-3 grid gap-4 text-muted sm:grid-cols-2">
        <div>
          <p className="font-medium text-ink">iPhone</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Open the chat, tap his name</li>
            <li>Export Chat → Without Media</li>
            <li>Save to Files, then choose it here</li>
          </ol>
        </div>
        <div>
          <p className="font-medium text-ink">Android</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Open the chat, tap ⋮ → More</li>
            <li>Export chat → Without media</li>
            <li>Save the file, then choose it here</li>
          </ol>
        </div>
      </div>
    </details>
  );
}
