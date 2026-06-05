#!/usr/bin/env python3
"""
build_android.py – Automates the full build pipeline for Android (Google Play).

Steps:
  1. npm run build  (Vite production build → dist/)
  2. npx cap sync android
  3. Prints Gradle command to generate the APK / AAB

Requirements:
  - Node.js + npm installed
  - Android Studio + SDK installed
  - Java JDK 17+ on PATH
  - npx cap init / android project already set up

Usage:
    python tools/build_android.py
    python tools/build_android.py --aab      # Build Android App Bundle (Google Play)
    python tools/build_android.py --release  # Release build (requires keystore)
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent

BOLD    = "\033[1m"
GREEN   = "\033[92m"
YELLOW  = "\033[93m"
RED     = "\033[91m"
RESET   = "\033[0m"


def run(cmd: str, cwd=None, desc: str = ""):
    """Run a shell command, streaming output. Raises on non-zero exit."""
    cwd = cwd or ROOT
    print(f"\n{BOLD}▶  {desc or cmd}{RESET}")
    print("─" * 60)

    result = subprocess.run(
        cmd, shell=True, cwd=cwd,
        stdout=sys.stdout, stderr=sys.stderr,
        text=True,
    )
    if result.returncode != 0:
        print(f"\n{RED}❌  Command failed (exit {result.returncode}){RESET}")
        sys.exit(result.returncode)

    print(f"{GREEN}✅  Done{RESET}")


def check_tools():
    """Verify required tools are on PATH."""
    print(f"\n{BOLD}🔍  Checking dependencies...{RESET}")
    required = {
        "node":  "Node.js",
        "npm":   "npm",
        "npx":   "npx (comes with npm)",
    }
    for tool, name in required.items():
        path = shutil.which(tool)
        if path:
            print(f"  {GREEN}✅{RESET}  {name}: {path}")
        else:
            print(f"  {RED}❌  {name} not found on PATH{RESET}")
            sys.exit(1)

    # Java (needed for Gradle)
    java = shutil.which("java")
    if java:
        print(f"  {GREEN}✅{RESET}  Java: {java}")
    else:
        print(f"  {YELLOW}⚠️   Java not found. Gradle builds will fail.{RESET}")


def step_install():
    """Install npm dependencies if node_modules doesn't exist."""
    nm = ROOT / "node_modules"
    if not nm.exists():
        run("npm install", desc="Installing npm dependencies")
    else:
        print(f"\n{GREEN}ℹ️   node_modules already present, skipping npm install{RESET}")


def step_build():
    """Vite production build."""
    run("npm run build", desc="Vite production build")
    dist = ROOT / "dist"
    if not dist.exists():
        print(f"{RED}❌  dist/ folder not created – build failed?{RESET}")
        sys.exit(1)

    # Report bundle size
    total = sum(f.stat().st_size for f in dist.rglob("*") if f.is_file())
    print(f"\n  📦  Build size: {total // 1024} KB ({len(list(dist.rglob('*')))} files)")


def step_cap_init():
    """Initialize Capacitor if android/ folder doesn't exist."""
    android_dir = ROOT / "android"
    if not android_dir.exists():
        print(f"\n{YELLOW}ℹ️   android/ not found – initialising Capacitor...{RESET}")
        run("npx cap init \"Sea Rescue\" \"com.searescue.game\" --web-dir dist",
            desc="Capacitor init")
        run("npx cap add android", desc="Adding Android platform")
    else:
        print(f"\n{GREEN}ℹ️   android/ already present{RESET}")


def step_cap_sync():
    """Sync web assets into the Android project."""
    run("npx cap sync android", desc="Capacitor sync → Android")


def step_build_apk(release=False, aab=False):
    """Run Gradle to assemble the APK or AAB."""
    android_dir = ROOT / "android"
    if not android_dir.exists():
        print(f"{RED}❌  android/ directory not found. Run without --aab first.{RESET}")
        sys.exit(1)

    gradle = android_dir / "gradlew"
    if sys.platform == "win32":
        gradle = android_dir / "gradlew.bat"

    if not gradle.exists():
        print(f"{YELLOW}⚠️   gradlew not found. Open in Android Studio first.{RESET}")
        _print_manual_steps(release, aab)
        return

    if aab:
        task = "bundleRelease" if release else "bundleDebug"
    else:
        task = "assembleRelease" if release else "assembleDebug"

    run(f'"{gradle}" {task}',
        cwd=android_dir,
        desc=f"Gradle {task}")

    # Find output
    if aab:
        outputs = list((android_dir / "app" / "build" / "outputs" / "bundle").rglob("*.aab"))
    else:
        outputs = list((android_dir / "app" / "build" / "outputs" / "apk").rglob("*.apk"))

    if outputs:
        print(f"\n{GREEN}{BOLD}📱  Output:{RESET}")
        for p in outputs:
            print(f"  {p.resolve()}")
    else:
        print(f"\n{YELLOW}⚠️   Build output not found – check Android Studio.{RESET}")


def _print_manual_steps(release, aab):
    task = ("bundle" if aab else "assemble") + ("Release" if release else "Debug")
    print(f"""
{BOLD}Manual steps in Android Studio:{RESET}

  1. Open Android Studio
  2. File → Open → select:  {ROOT / 'android'}
  3. Wait for Gradle sync to complete
  4. Build → Generate Signed Bundle / APK
     - Choose:  {'Android App Bundle (.aab)' if aab else 'APK'}
     - For release:  use your signing keystore
  5. Or run in terminal:
       cd {ROOT / 'android'}
       ./gradlew {task}

{BOLD}For Google Play:{RESET}
  - Build an .aab (App Bundle) for smaller download sizes
  - Sign with your release keystore
  - Target API level 34+ (required by Play Store)
""")


# ── Entry point ────────────────────────────────────────────────

def main():
    args     = sys.argv[1:]
    is_aab   = "--aab"     in args
    is_rel   = "--release" in args
    skip_apk = "--no-apk"  in args

    print(f"""
{BOLD}{'='*60}
  🌊  Sea Rescue – Android Build Pipeline
{'='*60}{RESET}
  Mode:      {'RELEASE' if is_rel else 'DEBUG'}
  Output:    {'App Bundle (.aab)' if is_aab else 'APK'}
""")

    check_tools()
    step_install()
    step_build()
    step_cap_init()
    step_cap_sync()

    if not skip_apk:
        step_build_apk(release=is_rel, aab=is_aab)

    print(f"""
{BOLD}{GREEN}{'='*60}
  ✅  Build pipeline complete!
{'='*60}{RESET}

Next steps for Google Play:
  1. Test on a real Android device
  2. Generate a signed release AAB:
       python tools/build_android.py --aab --release
  3. Create a Google Play Developer account (if needed)
  4. Upload the .aab to Play Console → Production

Useful Capacitor commands:
  npx cap open android       → Open in Android Studio
  npx cap run android        → Run on connected device
  npx cap sync               → Sync assets after npm run build
""")


if __name__ == "__main__":
    main()
