import { Phone, ChatCircle, ArrowSquareOut } from "@phosphor-icons/react";

export default function CrisisBanner({ resources, embedded = false }) {
  if (!resources) return null;
  return (
    <div
      data-testid="crisis-banner"
      className={`${embedded ? "" : "max-w-3xl mx-auto"} rounded-2xl border-2 border-crisis bg-sand-50 p-6 my-4`}
    >
      <h3 className="font-heading text-lg font-medium text-crisis">
        {resources.title}
      </h3>
      <p className="text-ink-600 mt-2 text-sm leading-relaxed">{resources.message}</p>
      <ul className="mt-4 space-y-2">
        {resources.resources.map((r, i) => {
          const Icon = r.type === "phone" ? Phone : r.type === "text" ? ChatCircle : ArrowSquareOut;
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <Icon weight="duotone" size={20} className="text-crisis shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-ink-900">{r.name}: </span>
                {r.type === "link" ? (
                  <a
                    href={r.contact}
                    target="_blank"
                    rel="noreferrer"
                    className="text-crisis underline"
                  >
                    Visit resources
                  </a>
                ) : (
                  <span className="text-ink-900">{r.contact}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
