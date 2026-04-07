// Calendar.jsx
import React, { useState } from "react";
import { ReactHorizontalDates } from "react-horizontal-date";
// import "./Calendar.css";

export default function Calendar() {  // ← export default здесь
  const [selectedDate, setSelectedDate] = useState(new Date());

  return (
    <div className="calendar">
      <ReactHorizontalDates
        initialDate={selectedDate}
        onDateChange={setSelectedDate}
        days={7}
        weekStartsOn="mon"
        classNames={{
          wrapper: "my-calendar-wrapper",
        //   day: "my-custom-day",
          dayNumber: "my-date-number",
          isSelected: "my-selected-day",
        }}
      />
    </div>
  );
}