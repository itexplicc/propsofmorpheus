from pathlib import Path
import sys
root = Path(__file__).resolve().parent
code = "".join(p.read_text(encoding="utf-8") for p in sorted((root / "build-parts").glob("*.pyfrag")))
script = root / "assembled-build.py"
ns = {"__name__": "__main__", "__file__": str(script)}
sys.argv = [str(script), *sys.argv[1:]]
exec(compile(code, str(script), "exec"), ns)
