const myAppointments = [
  {
    "Id": 1,
    "UserId": 2,
    "DoctorId": 1,
    "AppointDate": "2026-03-30T00:00:00.000Z",
    "AppointTime": "1970-01-01T10:30:00.000Z",
    "Status": "Booked",
    "CreatedAt": "2026-03-26T13:55:15.120Z"
  }
];

const subTab = 'upcoming';

const today = new Date();
today.setHours(0,0,0,0);
const filtered = myAppointments.filter(a => {
    const d = new Date(a.AppointDate);
    d.setHours(0,0,0,0);
    return subTab === 'upcoming' ? d >= today : d < today;
});

console.log("Filtered Length:", filtered.length);
if (filtered.length > 0) {
    console.log("Date compare true:");
    // simulate frontend rendering
    const appt = filtered[0];
    console.log("Time display:", appt.AppointTime.substring(0,5));
}
