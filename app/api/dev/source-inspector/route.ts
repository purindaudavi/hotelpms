import { readFile } from "node:fs/promises";
import path from "node:path";
import postcss from "postcss";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read only the project's fixed stylesheet; never accept a file path from a request.
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "app", "globals.css");
    const root = postcss.parse(await readFile(filePath, "utf8"), { from: filePath });
    const rules: {
      selector: string;
      line: string;
      column: string;
      conditions: { name: string; value: string }[];
      declarations: string;
    }[] = [];

    root.walkRules((rule) => {
      const conditions: { name: string; value: string }[] = [];
      let parent: postcss.ChildNode["parent"] | postcss.Document = rule.parent;
      while (parent) {
        // Do not treat animation steps or nested selectors as standalone selectors.
        if (parent.type === "rule") return;
        if (parent.type === "atrule") {
          const atRule = parent as postcss.AtRule;
          if (/keyframes$/i.test(atRule.name)) return;
          if (atRule.name === "media" || atRule.name === "supports") {
            conditions.push({ name: atRule.name, value: atRule.params });
          } else if (atRule.name !== "layer") {
            return;
          }
        }
        parent = parent.parent;
      }
      rules.push({
        selector: rule.selector,
        line: String(rule.source?.start?.line ?? 1),
        column: String(rule.source?.start?.column ?? 1),
        conditions,
        declarations: rule.nodes.map((node) => node.toString()).join("; ").slice(0, 300)
      });
    });

    return Response.json({ filePath, rules }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not read app/globals.css." }, { status: 500 });
  }
}
