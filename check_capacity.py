"""
Azure Region Capacity Checker for Project Ease
Tests AI Search and Container Apps availability across regions before azd up.
Run: python check_capacity.py
"""

import subprocess
import json
import threading
import time

REGIONS = [
    "westus2",
    "northcentralus",
    "swedencentral",
    "uksouth",
    "australiaeast",
    "canadacentral",
    "westeurope",
    "southcentralus",
    "eastus",
    "eastus2",
]

SUBSCRIPTION = "59310e93-5c42-49a8-9bcf-e31b45c222ef"

results = {}
lock = threading.Lock()


def run(cmd, timeout=120):
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, shell=True)
    return r.returncode, r.stdout + r.stderr


def check_region(region):
    rg = f"rg-captest-{region}"
    search_name = f"srch-{region.replace('us','').replace('east','e').replace('west','w')[:10]}-test"

    search_status = "UNKNOWN"
    aca_status = "UNKNOWN"

    try:
        # 1. Create resource group
        code, out = run(["az", "group", "create",
                         "--name", rg,
                         "--location", region,
                         "--subscription", SUBSCRIPTION,
                         "--output", "json"], timeout=30)
        if code != 0:
            with lock:
                results[region] = {"search": "RG_FAIL", "aca": "RG_FAIL"}
            return

        # 2. Test AI Search (free SKU)
        code, out = run(["az", "search", "service", "create",
                         "--name", search_name,
                         "--resource-group", rg,
                         "--sku", "free",
                         "--location", region,
                         "--output", "json"], timeout=120)
        if code == 0:
            search_status = "OK"
        elif "InsufficientResources" in out or "capacity" in out.lower() or "quota" in out.lower():
            search_status = "NO_CAPACITY"
        elif "already exists" in out.lower():
            search_status = "OK"  # name clash = region works
        else:
            search_status = f"ERR"

        # 3. Test Container Apps Environment
        env_name = f"env-captest-{region[:8]}"
        code, out = run(["az", "containerapp", "env", "create",
                         "--name", env_name,
                         "--resource-group", rg,
                         "--location", region,
                         "--output", "json"], timeout=180)
        if code == 0:
            aca_status = "OK"
        elif "capacity" in out.lower() or "InsufficientResources" in out or "heavy usage" in out.lower():
            aca_status = "NO_CAPACITY"
        elif "already exists" in out.lower():
            aca_status = "OK"
        else:
            aca_status = f"ERR"

    except subprocess.TimeoutExpired:
        search_status = "TIMEOUT"
        aca_status = "TIMEOUT"
    finally:
        # Cleanup (fire and forget)
        subprocess.Popen(["az", "group", "delete", "--name", rg,
                          "--yes", "--no-wait", "--subscription", SUBSCRIPTION],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, shell=True)

    with lock:
        results[region] = {"search": search_status, "aca": aca_status}


def main():
    print("=" * 55)
    print("  Azure Region Capacity Checker — Project Ease")
    print("=" * 55)
    print(f"Testing {len(REGIONS)} regions in parallel...")
    print("Takes ~3-4 minutes. Cleanup runs in background.\n")

    threads = [threading.Thread(target=check_region, args=(r,), daemon=True)
               for r in REGIONS]
    for t in threads:
        t.start()

    while any(t.is_alive() for t in threads):
        print(".", end="", flush=True)
        time.sleep(6)
    for t in threads:
        t.join()

    print("\n")
    print(f"{'Region':<22} {'AI Search':<16} {'Container Apps':<16} {'Verdict'}")
    print("-" * 70)

    good_regions = []
    for region in REGIONS:
        r = results.get(region, {"search": "?", "aca": "?"})
        s = r["search"]
        a = r["aca"]
        both_ok = s == "OK" and a == "OK"
        verdict = "✓ USE THIS" if both_ok else ("✗ search" if s != "OK" else "✗ aca")
        print(f"{region:<22} {s:<16} {a:<16} {verdict}")
        if both_ok:
            good_regions.append(region)

    print("-" * 70)
    if good_regions:
        print(f"\n→ Run azd up and pick: {good_regions[0]}")
        if len(good_regions) > 1:
            print(f"  Backups: {', '.join(good_regions[1:])}")
    else:
        print("\n✗ No fully available regions found. Try again in 30 min.")
        print("  Or expand REGIONS list at top of this script.")


if __name__ == "__main__":
    main()
