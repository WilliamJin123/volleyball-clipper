(function () {
  try {
    var P = {
      obsidian: { "bg-void": "#06060A", "bg-surface": "#0F0F14", "bg-raised": "#16161D", "border-dim": "#1E1E28", "border-bright": "#2A2A3A", "text-primary": "#E8E8ED", "text-secondary": "#7A7A8A", "text-dim": "#4A4A58", "accent-primary": "#FF5A1F", "accent-secondary": "#3B82F6", "accent-hot": "#E040FB", "accent-success": "#22D37A", "accent-warning": "#F59E0B", "accent-error": "#EF4444" },
      midnight: { "bg-void": "#080B14", "bg-surface": "#0E1221", "bg-raised": "#151A2E", "border-dim": "#1E2540", "border-bright": "#2A3455", "text-primary": "#E2E8F0", "text-secondary": "#7086A8", "text-dim": "#465672", "accent-primary": "#6366F1", "accent-secondary": "#38BDF8", "accent-hot": "#C084FC", "accent-success": "#34D399", "accent-warning": "#FBBF24", "accent-error": "#F87171" },
      crimson: { "bg-void": "#0A0608", "bg-surface": "#140D10", "bg-raised": "#1D1318", "border-dim": "#2A1A22", "border-bright": "#3D2430", "text-primary": "#F0E4E8", "text-secondary": "#8A6B78", "text-dim": "#5A4450", "accent-primary": "#DC2626", "accent-secondary": "#FB923C", "accent-hot": "#F472B6", "accent-success": "#4ADE80", "accent-warning": "#FACC15", "accent-error": "#EF4444" },
      emerald: { "bg-void": "#060A08", "bg-surface": "#0C140F", "bg-raised": "#131D17", "border-dim": "#1A2A22", "border-bright": "#253D32", "text-primary": "#E4F0EA", "text-secondary": "#6B8A78", "text-dim": "#445A4F", "accent-primary": "#10B981", "accent-secondary": "#06B6D4", "accent-hot": "#A78BFA", "accent-success": "#22D37A", "accent-warning": "#F59E0B", "accent-error": "#EF4444" },
      arctic: { "bg-void": "#F4F6F8", "bg-surface": "#FFFFFF", "bg-raised": "#E8ECF0", "border-dim": "#D1D5DB", "border-bright": "#9CA3AF", "text-primary": "#0F172A", "text-secondary": "#475569", "text-dim": "#94A3B8", "accent-primary": "#3B82F6", "accent-secondary": "#8B5CF6", "accent-hot": "#EC4899", "accent-success": "#059669", "accent-warning": "#D97706", "accent-error": "#DC2626" }
    };

    function g(h, o) {
      var r = parseInt(h.slice(1, 3), 16),
        g2 = parseInt(h.slice(3, 5), 16),
        b = parseInt(h.slice(5, 7), 16);
      return "rgba(" + r + "," + g2 + "," + b + "," + o + ")";
    }

    var raw = localStorage.getItem("volleyclip-theme");
    if (raw) {
      var t = JSON.parse(raw);
      var c = Object.assign({}, P[t.presetId] || P.obsidian, t.customColors || {});
      var s = document.documentElement.style;
      for (var k in c) s.setProperty("--color-" + k, c[k]);

      var ap = c["accent-primary"],
        bv = c["bg-void"],
        as = c["accent-success"],
        ae = c["accent-error"],
        asc = c["accent-secondary"];

      s.setProperty("--accent-primary-glow", g(ap, 0.15));
      s.setProperty("--accent-primary-glow-03", g(ap, 0.03));
      s.setProperty("--accent-primary-glow-08", g(ap, 0.08));
      s.setProperty("--accent-primary-glow-10", g(ap, 0.1));
      s.setProperty("--accent-primary-glow-12", g(ap, 0.12));
      s.setProperty("--accent-primary-glow-04", g(ap, 0.04));
      s.setProperty("--accent-primary-glow-06", g(ap, 0.06));
      s.setProperty("--accent-primary-glow-25", g(ap, 0.25));
      s.setProperty("--accent-primary-glow-30", g(ap, 0.3));
      s.setProperty("--accent-primary-glow-50", g(ap, 0.5));
      s.setProperty("--accent-primary-glow-70", g(ap, 0.7));
      s.setProperty("--accent-secondary-glow", g(asc, 0.12));
      s.setProperty("--bg-void-50", g(bv, 0.5));
      s.setProperty("--bg-void-70", g(bv, 0.7));
      s.setProperty("--bg-void-75", g(bv, 0.75));
      s.setProperty("--bg-void-80", g(bv, 0.8));
      s.setProperty("--bg-void-85", g(bv, 0.85));
      s.setProperty("--bg-void-90", g(bv, 0.9));
      s.setProperty("--bg-void-92", g(bv, 0.92));
      s.setProperty("--bg-void-95", g(bv, 0.95));
      s.setProperty("--accent-success-glow-08", g(as, 0.08));
      s.setProperty("--accent-error-glow-06", g(ae, 0.06));
      s.setProperty("--accent-error-glow-08", g(ae, 0.08));
      s.setProperty("--accent-error-glow-12", g(ae, 0.12));
      s.setProperty("--accent-error-glow-15", g(ae, 0.15));
      s.setProperty("--accent-error-glow-30", g(ae, 0.3));
      s.setProperty("--bg-surface-glass", g(c["bg-surface"], 0.55));
      s.setProperty("--bg-raised-glass", g(c["bg-raised"], 0.5));
      var vr = parseInt(bv.slice(1,3),16), vg = parseInt(bv.slice(3,5),16), vb = parseInt(bv.slice(5,7),16);
      s.setProperty("--dither-invert", (vr*0.299+vg*0.587+vb*0.114)/255 > 0.5 ? "1" : "0");
    }
  } catch (e) {}
})();
