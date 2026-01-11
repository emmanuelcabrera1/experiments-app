import time
from playwright.sync_api import sync_playwright, expect

def verify_bugs(page):
    # 1. Check Missing Primary Color
    page.goto("http://localhost:8000/index.html")
    page.wait_for_load_state("networkidle")

    # Check a specific element that uses --primary-color.
    # In app.js: color: var(--primary-color) is used in Experiment Detail for high completion.
    # Also in weekly summary.
    # Let's check the ".btn-primary" class. In base.css/components.css it might use it?
    # components.css:
    # .btn-primary { background: var(--active-bg); color: var(--active-text); } -> This uses active-bg, not primary-color.

    # app.js uses var(--primary-color) in `renderExperimentDetail` (streak status) and `renderStreakStatusBanner`.
    # And `checkWeeklySummary`.

    # Let's check `tokens.css`. I know it's missing.
    # But let's verify via computed style if possible, or just rely on the grep I did.
    # The grep was conclusive. I don't need to struggle to reproduce visual glitch if I know the variable is missing.
    # However, I will screenshot the "Focus Ring" issue which is visual.

    # 2. Check Focus Loss on Filter Change
    print("Checking Focus Loss...")
    work_pill = page.get_by_role("button", name="WORK")
    work_pill.click()
    # After click, render() happens, blowing away the DOM.
    # Check active element.
    active_tag = page.evaluate("document.activeElement.tagName")
    print(f"Active Element after click: {active_tag}")

    if active_tag == "BODY":
        print("FAIL: Focus lost to BODY after filter change.")
    else:
        print(f"PASS: Focus is on {active_tag}")

    # 3. Check Orphaned Category
    print("Checking Orphaned Category...")
    # Add category
    page.evaluate("DataManager.addCategory('OrphanCat')")
    page.reload()

    # Create experiment with this category
    page.evaluate("""
        DataManager.createExperiment({
            title: 'Orphan Experiment',
            purpose: 'Test',
            durationDays: 30,
            frequency: 'daily',
            category: 'OrphanCat',
            startDate: new Date().toISOString()
        })
    """)
    page.reload()

    # Verify it appears
    page.get_by_role("button", name="OrphanCat").click()
    expect(page.get_by_text("Orphan Experiment")).to_be_visible()

    # Delete category
    page.evaluate("DataManager.deleteCategory('OrphanCat')")
    page.reload()

    # Check if pill exists
    count = page.get_by_role("button", name="OrphanCat").count()
    if count == 0:
        print("PASS: OrphanCat pill is gone.")
    else:
        print("FAIL: OrphanCat pill still exists.")

    # Check if experiment exists in ALL
    page.get_by_role("button", name="ALL").click()
    expect(page.get_by_text("Orphan Experiment")).to_be_visible()
    print("PASS: Experiment still exists in ALL.")

    # Take screenshot of the orphaned state (Experiment visible, but no category pill)
    page.screenshot(path="verification/bug_verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_bugs(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
