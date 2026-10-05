# Society Election System (Offline)

A complete voting system for AOA / society elections that runs on one laptop with **no internet**.

- **Voting booth**: large buttons, English and Hindi, voice guidance and a practice mode.
- **Team (panel) elections**: several teams of 10. Each voter picks up to 10 members from any team, or taps **"Select whole team"**.
- **Weighted votes by flat size**: for example, A block (1500 sq ft) = 1.25 and D block = 1.75. Results are ranked by the **sum of weights**.
- **Face verification**: each voter is matched against their registered face before they can vote.
- **No duplicate votes**: one vote per person, and optionally one vote per flat.
- **Votes can't be changed**: once a vote is cast it is sealed and can't be edited.
- **Secret ballot**: the system records *that* someone voted, never *whom* they voted for.
- **Live counting** on the admin dashboard, plus a results screen for a TV.
- **Automatic backups** after every vote and every 5 minutes.

---

## 1. Starting the app (Mac)

1. Double-click **`Start Election.command`**.
   - If macOS says it "cannot be opened", **right-click → Open → Open** (only needed the first time).
   - If asked to install "Command Line Developer Tools", click **Install**, wait, then double-click again (this needs internet just once).
2. Chrome opens at `http://localhost:8000`. Keep the black Terminal window open during the election.
3. Allow camera access when Chrome asks.

To stop: close the Terminal window (or press Ctrl+C). All data stays saved.

> **Windows:** install Python 3 from python.org (tick "Add to PATH"), then double-click `Start Election (Windows).bat`.

**Want to watch the count from your phone?** Use `Start Election (allow Wi-Fi admin).command` instead. Any phone or laptop on the **same Wi-Fi router** can open the Admin panel and Results screen using the address shown in the Terminal. You don't need internet, only the router. Voting itself still happens only on the booth laptop.

---

## 2. Before election day

Open **Admin Panel**:

1. **First time**: create an **Admin PIN** (for you) and a **Polling Officer PIN** (for the person at the booth).
2. **Teams & Candidates**:
   - **Add each team** with a colour and a symbol, e.g. 🌳 Team Pragati or 🪔 Team Ekta.
   - **Add one post**, *Managing Committee*, with **seats = 10**.
   - **Add the candidates**, picking each one's team (or *Independent*). A photo helps elderly voters.
   - *(Separate posts like President still work: one post per screen.)*
3. **Settings → Vote weight by block**: enter each block's area and weight, e.g. A = 1500 sq ft → **1.25**, D → **1.75**.
   - The block is read from the flat number, so `A-101` is block A. The table shows how many flats each block has.
   - Flats with no matching block use **"Any other flat"**.
   - For one unusual flat, open that voter and type a custom **Vote weight**.
   - **Team rules** are here too: *Allow mixing teams* (on by default) and *Voter must choose all 10* (off by default).
   - All of these **lock once voting opens**.
4. **Voters**: click *Add voter*, or *Import CSV* from Excel (columns: `Name, Flat, Phone, ID Type, ID Number`, plus an optional `Weight`).
5. **Register faces**: open each voter → **Use camera** → **Capture**. You can also upload a clear front-facing photo.
   - If someone is registered twice, the system warns you that the face already belongs to another voter.
6. *(Optional)* **Print voter slips**. Each slip has a QR code the voter can show to the booth camera, so they don't have to type.
7. **One vote per flat** is ON by default, because the weight belongs to the flat. Turn it off in Settings if every member should vote separately.
8. **Trial run**: let committee members vote, check the dashboard, then **Settings → Reset all votes**. Voters, faces and candidates are kept.

---

## 3. Election day

1. Dashboard → **▶ Open voting**.
2. On the booth laptop open **Voting Booth** and press **Cmd+Ctrl+F** (Mac) or **F11** (Windows) for full screen.
3. Voters follow 4 steps on screen: **Find name → Look at camera → Choose → Confirm**.
4. **If a face doesn't match** (bad light, glasses, an elderly voter): after 3 tries the booth asks for the **polling officer**. The officer checks the voter's **physical photo ID**, picks a reason and enters the Officer PIN. The booth saves a photo of the voter, and every override shows up in the Audit Log.
5. Watch turnout live on the **Dashboard**. Use **🙈 Hide counts** if people can see your screen.
6. Put the **Results Screen** on a TV. It shows only turnout until voting closes (you can change this in Settings).

## 4. Closing

1. Dashboard → **⏹ Close voting** (needs the Admin PIN). **This is final.**
2. **🖨 Print result sheet**. It has signature lines for the Election Officer and observers, plus a *fingerprint* code that proves the result hasn't been altered.
3. Copy the whole **`data`** folder to a pen drive. Settings also lets you download the results, turnout list and audit log as CSV (they open in Excel).

---

## How weighted counting works

Each ballot stores the voter's **vote value**, e.g. 1.75 for a D-block flat. A candidate's score is the **sum of the vote values** of everyone who chose them.

> Example: two A-block voters (1.25 each) and one D-block voter (1.75) choose Ramesh, so Ramesh gets 1.25 + 1.25 + 1.75 = **4.25**.

The **top 10 by weighted score** are elected. The dashboard, TV screen, printed sheet and Excel export show both numbers: **weighted votes** and **how many voters** chose each candidate. They also show a **team summary** (seats won by each team). If two candidates are equal at the 10th place, it is marked **TIE** for the committee to decide.

## How fairness is protected

| Risk | Protection |
|---|---|
| Someone votes twice | The voter is marked as voted in the same database step that saves the ballot. A second attempt is blocked and logged. |
| Someone votes for another person | Face match against the registered face, an optional blink check against printed photos, and a check that only one person is in front of the camera. Officer overrides need the PIN and are logged with a photo. |
| Same person registered twice | New faces are compared with every registered face. |
| Weights changed mid-election | The weight table, team rules and one-vote-per-flat lock as soon as voting opens. Each ballot's weight is part of its digital seal. |
| Votes edited later | Each ballot carries a digital seal (HMAC), the database refuses edits to ballots, and the **Tamper check** compares ballots with voters. |
| Knowing who voted for whom | Ballots are stored with no name, no time and in random order. |
| Laptop or power failure | Every vote is written to disk at once, `data/backups/latest.db` is refreshed after each vote, and timestamped copies are made every 5 minutes. Restart the app and it carries on. |
| Voting from another device | The booth only accepts votes from the laptop the app runs on. |

**Tips:** put the booth where light falls on the voter's face, not behind them, and screen it so others can't see the ballot. If elderly voters often fail the face check, move *Face match strictness* to about 0.55.

## Folder contents

```
Start Election.command                 ← double-click to run (Mac)
Start Election (allow Wi-Fi admin).command
Start Election (Windows).bat
server.py                              ← the app (Python 3, no extra installs)
web/                                   ← screens + offline face-recognition models
data/                                  ← created on first run: election.db + backups/
```

To start a completely fresh election (new year), close the app and move the `data` folder somewhere else.
# society-election-
