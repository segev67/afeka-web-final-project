inal Project 2026: Web Platform Development - Semester A

*Translated based on project guidelines document [1-6]*

The work is possible individually or in pairs.

## Core Architecture
The site will contain access to **two servers**: one **Express** and the other **Next.js**. [1]

### 1. Express Server
*   **A.** Through which the user identifies themselves and their data is saved, encrypted with **salt**.
*   **B.** It issues a **JWT** authorization token (containing the names of the submitter or submitters); the token will be valid for the second server and will also **refresh silently** (unnoticed by the user) once a day. [1]

### 2. Next.js Server
*   Access to every page is accompanied by **middleware authorization** with the token (soft - unnoticed by the user).
*   You must build a site with a homepage bearing the title – "Afeka Hiking Trails 2026", homepage name - `index.html` (unless required otherwise by the server), and points to two links/menus/additional pages (design is your choice). [1]

---

## Page Requirements

### Page 1: Route Planning [2]
Contains a menu for creating hiking routes with maps.
*   For an example of the ability to display maps and routes see: `https://leafletjs.com/examples/quick-start/`.
*   All information on the hiking routes is drawn from **LLM models**.

### Page 2: Routes History [2]
Retrieving the route from a database.

### User Inputs [2]
The user decides only on:
1.  Name of Country/Region/City.
2.  Trip type: **Trek** or **Bicycle**.
3.  Trip duration in days.

### Output Specifications [2, 3]
The output is in a pleasant interface of:

**Route Planning:**
*   **For Bicycle:** A route of two or three continuous days (from city to city) on a map, with a bicycle limit minimum and maximum defaults of **30 to 70 km** + information on the length of every route per day.
*   **For Foot Trek:** **5-10 km**. 1-3 routes that start at the origin point and end at them. Information on the length of every route per day.

**Important Logic Notes:**
*   Note that the routes should **not** come out as a straight line from point to point but actually a **realistic route on paths/roads**. [3]
*   Every product is accompanied by a **real weather forecast** for the upcoming three days on the routes (Assumption - the route starts to be performed the next day). [3]
*   A single picture (characteristic of the country) will be attached to the route page, real or produced in **Generative code**. No quality control is required on the image. [3]
*   Every run of a product is received, checked, and approved by the user (without weather forecast), and **saved in a database**. [3]

**Routes History Functionality:**
*   Ability to retrieve a route that was planned in the past in the previous section with the addition of a weather forecast for the start of execution tomorrow. [4]

---

## Defense & Examination [4]
The project mandates knowledge by **both partners** regarding its details.

**Every line of code/code segment is likely to be examined:**
1.  To which **technology** does it belong and the **theoretical understanding** of the use of this code.
2.  Understanding the **functionality** of the line/segment and **what will happen if it is removed**.
3.  Basic implementation of the technology in the project if it was taught in the course.
4.  **Optimal utilization of Next.js technology** in the context of the project.

Arrival at the defense is in pairs, the exam is one-on-one and accordingly, the grade is relevant to each separately.

---

## Submission Guidelines [5, 6]
The work will be uploaded for each of the participants to their **GitHub**, and will also include a slide.

**The Slide:**
*   **Page 1:** Names of performers, location in GitHub and in the Cloud.
*   **Page 2:** **Known Bugs** and/or known problems (discoveries during the defense without listing them will significantly lower the grade).
*   **Page 3:** The **architectural structure** of the project, and the rest of the pages are samples of important segments from within the project.

**GitHub:**
*   GitHub will include a `readme.md` containing detailed explanations on the installation method, explanations on the project, and the address in the cloud.

**Zoom Defense:**
*   In the Zoom defense, the project will appear in the VSCODE of each of the participants, and will start with the presentation of the project slide.

Please go wild in the project with ideas and executions; the project will be examined on effort and the ideas required to achieve the result.
The more you add, the better.