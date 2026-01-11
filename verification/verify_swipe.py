
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Load the index file directly
        import os
        cwd = os.getcwd()
        page.goto(f'file://{cwd}/projects/experiments-web/index.html')

        # Inject seed data script
        page.evaluate('''() => {
            const data = {
                experiments: [
                    {
                        id: 'exp1',
                        title: 'Test Experiment 1',
                        purpose: 'Testing Swipe',
                        status: 'active',
                        durationDays: 30,
                        entries: [],
                        reflections: [],
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'exp2',
                        title: 'Test Experiment 2',
                        purpose: 'Testing Swipe 2',
                        status: 'active',
                        durationDays: 30,
                        entries: [],
                        reflections: [],
                        createdAt: new Date().toISOString()
                    }
                ],
                labs: []
            };
            localStorage.setItem('experiments_db', JSON.stringify(data));
        }''')

        page.reload()

        # Handle Potential Modal
        try:
            # Wait a bit for the modal to potentially appear
            time.sleep(1)
            if page.is_visible('#modal-weekly-summary.active'):
                print('Closing Weekly Summary Modal...')
                page.click('button[data-close="modal-weekly-summary"]')
                time.sleep(0.5)
        except Exception as e:
            print(f'Modal handling error (ignorable): {e}')

        # Wait for the experiment row to appear
        try:
            row = page.wait_for_selector('.experiment-row', timeout=5000)
            if not row:
                print('No experiment row found.')
                browser.close()
                return

            print('Found experiment row.')

            # Initial Screenshot
            page.screenshot(path='verification/initial_clean.png')

            # Get dimensions
            box = row.bounding_box()
            if not box:
                print('Could not get bounding box.')
                browser.close()
                return

            center_y = box['y'] + box['height'] / 2

            # 1. Swipe Right (Left -> Right)
            print('Swiping Right...')
            page.mouse.move(box['x'] + 10, center_y)
            page.mouse.down()
            page.mouse.move(box['x'] + 200, center_y, steps=20)
            page.mouse.up()

            time.sleep(1) # Wait for animation
            page.screenshot(path='verification/swipe_right_open.png')
            print('Screenshot saved: swipe_right_open.png')

            # Close it (tap outside)
            page.mouse.click(box['x'] + 300, center_y + 200)
            time.sleep(0.5)

            # 2. Swipe Left (Right -> Left)
            print('Swiping Left...')
            page.mouse.move(box['x'] + 300, center_y) # Start right
            page.mouse.down()
            page.mouse.move(box['x'] + 50, center_y, steps=20) # Move left
            page.mouse.up()

            time.sleep(1) # Wait for animation
            page.screenshot(path='verification/swipe_left_open.png')
            print('Screenshot saved: swipe_left_open.png')

        except Exception as e:
            print(f'Error: {e}')

        browser.close()

if __name__ == '__main__':
    run()
