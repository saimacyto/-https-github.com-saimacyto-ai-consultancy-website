import { loadMeta } from "./data.js";
const meta = await loadMeta();
document.getElementById("updated").textContent = meta
  ? `Current build: ${meta.count.toLocaleString()} organizations, generated ${new Date(meta.generated).toLocaleDateString("en-US", { dateStyle: "long" })}${meta.sample ? " (demo sample data)" : ""}.`
  : "Build details unavailable.";
