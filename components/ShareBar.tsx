"use client";

import { useRef, useState } from "react";
import { ChevronDown, Code, Download, File, Link, Share } from "./Icons";

export function ShareBar({ slug }: { slug: string }) {
  const [msg, setMsg] = useState("");
  const menu = useRef<HTMLDetailsElement>(null);
  const flash = (m: string) => {
    setMsg(m);
    menu.current?.removeAttribute("open");
    setTimeout(() => setMsg(""), 1800);
  };
  const copy = async (text: string | Promise<string>, label: string) => {
    try {
      await navigator.clipboard.writeText(await text);
      flash(`${label} copied`);
    } catch {
      flash("Copy failed; try the download instead");
    }
  };
  const md = `/api/guides/${slug}?format=md`;
  return (
    <>
      <button className="btn" onClick={() => copy(window.location.href, "Link")}>
        <Link size={14} /> Copy link
      </button>
      <details className="menu" ref={menu}>
        <summary className="btn">
          <Share size={14} /> Export <ChevronDown size={14} />
        </summary>
        <div className="menu-pop">
          <button onClick={() => copy(fetch(md).then((r) => r.text()), "Markdown")}>
            <File size={14} /> Copy as Markdown
          </button>
          <a href={md} download={`${slug}-oauth-guide.md`} onClick={() => menu.current?.removeAttribute("open")}>
            <Download size={14} /> Download .md
          </a>
          <a href={`/api/guides/${slug}`} target="_blank" rel="noreferrer">
            <Code size={14} /> JSON for agents
          </a>
        </div>
      </details>
      {msg && <span className="toast">{msg}</span>}
    </>
  );
}
