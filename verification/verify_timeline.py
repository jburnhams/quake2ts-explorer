from playwright.sync_api import sync_playwright

def verify_timeline():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (using port 3000 as per server.log)
        page.goto("http://localhost:3000")

        # Wait for app to load (checking for file tree or viewer)
        try:
            page.wait_for_selector(".file-tree", timeout=10000)

            # Expand 'demos' folder if it exists
            # We assume standard pak.pak structure or uploaded content
            # If default pak has demos:
            demos_folder = page.get_by_text("demos")
            if demos_folder.count() > 0:
                demos_folder.first.click()
                # Wait for files to expand
                page.wait_for_timeout(1000)

                # Look for a .dm2 file
                # Often files are like demo1.dm2
                dm2_file = page.get_by_text("demo1.dm2")
                if dm2_file.count() > 0:
                    dm2_file.first.click()

                    # Wait for viewer to load and timeline to appear
                    # Timeline has class .demo-timeline
                    try:
                        page.wait_for_selector(".demo-timeline", timeout=5000)
                        print("Timeline found!")
                    except:
                        print("Timeline NOT found within timeout.")

                    # Take screenshot
                    page.screenshot(path="verification/timeline_visible.png")
                    print("Screenshot taken: verification/timeline_visible.png")
                else:
                    print("No dm2 file found. Taking screenshot of file list.")
                    page.screenshot(path="verification/file_list.png")
            else:
                 print("No demos folder found. Taking screenshot of root.")
                 page.screenshot(path="verification/root.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")

        browser.close()

if __name__ == "__main__":
    verify_timeline()
