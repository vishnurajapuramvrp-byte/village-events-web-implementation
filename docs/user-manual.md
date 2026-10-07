# User Manual

## 1. Getting started

Open the application URL supplied by your administrator. Sign in with the Google account approved for the village, or enter the email/mobile number and temporary password provided by an Admin.

If you have a temporary password, the app requires you to choose a replacement before using the application. Use at least eight characters and enter the same value in both password fields. Keep your password private and sign out when using a shared device.

Your available screens depend on your role. If you can sign in but do not see village data, ask an Admin to assign your account to the correct village.

## 2. Navigation by role

- **Admin:** Dashboard, Events, Reminders, Reports, Audit, and Users.
- **Treasurer:** Dashboard, Events, Reminders, Reports, and Audit.
- **Committee member:** Dashboard, Events, and Reports. Can create/edit events and submit feedback, but cannot change finance records.
- **Viewer:** Dashboard, Events, and Reports in read-only mode.
- **Recipient:** My distribution only. Recipient accounts see only the person record linked to their login.

## 3. Dashboard

The dashboard summarizes the village ledger. Select an event to open its detailed records. Use **View all** to open the event list, **Report** to find event reports, and **Reminders** when the link is available to view due-date tracking.

Recipients can choose **View my distribution** to see principal, interest to date, outstanding amount, due date, and repayments. A due reminder may appear in the app when a distribution is due within 30 days or overdue. The reminder itself does not show a financial amount.

## 4. Create an event

1. Open **Events** and select **New event**. If the button is unavailable, your role cannot create events.
2. Enter the event name, year, start date, and any available description, end date, or opening balance.
3. Select **Create event**. The new event opens with Active status.
4. Check the opening amount and dates before recording transactions.

To edit an event, open it and select **Edit event**. Closed events cannot be edited. An event can be deleted from the Events list while it is open; deletion removes its linked ledger data, so verify the event carefully before deleting it.

## 5. Import an Excel workbook

1. Open **Events** and download the sample template.
2. Complete the `Event Details`, `Donations`, and `Expenses` sheets. Include the required headers and check dates and amounts.
3. Save as `.xlsx`; files must be smaller than 10 MB.
4. Choose the file under **Import Excel workbook** and select **Upload and import**.
5. Read the result message, then open the event to review every imported row and its calculated balance.

An event with the same name and year is updated. Donations and expenses are appended, so importing the same workbook more than once can duplicate rows that do not have a unique donation transaction reference. Correct the workbook before retrying. A validation error means the import transaction was not committed; review the stated sheet/row and correct it before retrying.

## 6. Record donations

1. Open the event and expand **Donations**.
2. Enter donor, amount in rupees, date received, and payment method. Add a transaction reference when available.
3. Select **Add donation** and confirm it appears in the list and totals.

Transaction references must be unique. If the amount is zero, a transaction reference is required. To correct an open-event entry, use **Edit** or **Delete** beside that donation. These changes affect the computed event balance.

## 7. Record expenses

1. Open the event and expand **Expenses**.
2. Enter category, positive amount in rupees, description, and date. Add payee and receipt reference when available.
3. Select **Add expense** and confirm the entry appears in the list.

Use **Edit** or **Delete** beside an entry to correct an open-event expense. Retain original receipts and verify them during reconciliation.

## 8. Record a distribution

1. Open the event and expand **Distributions**.
2. Enter the recipient name and optional phone. If this is a new person, the app creates a village person record from these details.
3. Enter both guarantors' names and phone numbers. All four guarantor fields are required.
4. Enter the principal, amount source, interest rate, interest method, start date, and optional due date. Without a due date, the system uses one year after the start date.
5. Add optional notes and select **Create distribution**.
6. Confirm the entry, due date, interest, and outstanding total.

Donation-funded principal cannot exceed the event's current distributable balance. Event Generated Amount is tracked separately. Interest methods are Annual simple, Monthly simple, Fixed amount, and Custom. Custom currently calculates the same way as Annual simple. Confirm the rate, method, fixed interest, and dates with the committee before saving; financial terms are not automatically validated against local requirements.

To correct a distribution, use **Edit distribution**. Changing its due date replaces its reminder schedule. Phone numbers may be masked based on your role.

## 9. Record a repayment

1. Find the distribution in the event's **Distributions** section.
2. Enter the repayment amount and payment date; add a note if useful.
3. Select **Record repayment**.
4. Check the updated repaid and outstanding values.

The form currently allows recording an amount greater than the outstanding balance. Verify the amount and date before submitting; contact an Admin/Treasurer if the ledger needs correction.

## 10. Add event feedback

1. Open an event and expand **Feedback**.
2. Enter an observation, follow-up, or committee decision and select **Record feedback**.
3. Use **Mark completed** when the item is resolved. Select **Reopen feedback** if more work is needed.

Signed-in users with access to the event can add and update feedback status. Feedback is included in the event PDF.

## 11. Review reminders

Users with reminder permission can open **Reminders**, optionally filter by event, and check the scheduled date and queued/sent state. Reminders are scheduled at 30, 15, and 7 days before due date, on the due date, and one day after.

The current application does not send a message to a phone or email. The daily job marks reminders sent and writes generic text to the application log. Do not treat the status as proof that a recipient was contacted.

## 12. Download a report

1. Open **Reports** and filter by year and/or event, or open an event and select **Download PDF**.
2. Open the downloaded PDF and verify event name, dates, donations, expenses, distributions, balance, and feedback.
3. Use the report's signature section as appropriate for the village's review process.

Confirm report totals against receipts and source records. The report is generated from the current database contents and does not replace accounting review.

## 13. Admin: manage users

1. Open **Users**.
2. Under **Add user**, enter the person's name and at least one login identifier (email or mobile), a temporary password of at least eight characters, and a role.
3. Optionally link the user to an existing village person. Select **Create user**.
4. Give the user their login identifier and temporary password privately. They must change the password on first sign-in.
5. To change access, select a role in the directory and choose **Update**. Role changes are audited.
6. To remove access, choose **Delete** and verify the target account first.

The app will not allow deletion of your own account or removal of the last Admin. Linking a recipient account to the correct person is required for the recipient's own distribution page to work.

## 14. Admin: audit and close-out

Admins and Treasurers can review **Audit** to inspect recorded changes. Before closing an event:

1. Check that donations and expenses match source records.
2. Check each distribution and repayment, including recipient and guarantor details.
3. Review the computed available and distributable balances and resolve open feedback.
4. Download and verify the PDF report.
5. From the event page, select **Close event** only when the committee is ready to lock it.

Closed events cannot be edited or deleted, and finance entry controls are unavailable. Closure is blocked if donation-funded principal still distributed exceeds available funds.

## 15. Troubleshooting

| Issue | What to do |
|---|---|
| No village data after sign-in | Ask an Admin to assign the account to a village, then sign out and back in. |
| A page or button is missing | Your role may not have the required permission. Ask an Admin to review your role. |
| Duplicate transaction reference | Check the other donation record and use the correct unique reference. |
| Distribution exceeds balance | Review opening balance, donations, expenses, repayments, and existing donation-funded distributions. |
| Workbook import fails | Download the template again, check required sheet names/headers, dates, amounts, and file size. Review the event before retrying. |
| Recipient sees no distribution | Ask an Admin to link the login to the matching person record. |
| Reminder says sent but no message arrived | Reminder delivery is not configured in this release; status means the job processed the reminder. |
| Event cannot be changed | It may be closed. Closed events are locked. |

For financial corrections, retain supporting documents and ask an authorized Treasurer or Admin to make the change. For lending use, obtain local legal and accounting advice.