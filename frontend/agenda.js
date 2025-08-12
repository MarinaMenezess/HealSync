document.addEventListener('DOMContentLoaded', function() {
    var calendarEl = document.getElementById('calendar');
    var modalContainer = document.getElementById('modal-container');
    var eventDateInput = document.getElementById('event-date');
    var eventTitleInput = document.getElementById('event-title');
    var eventTimeInput = document.getElementById('event-time');
    var createBtnModal = document.getElementById('create-btn-modal');
    var closeBtns = document.querySelectorAll('#modal-container button');

    var calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      editable: true,
      selectable: true,
      dateClick: function(info) {
        eventDateInput.value = info.dateStr;
        modalContainer.classList.add('active');
      },
      events: [
        // Exemplo de evento
        {
          title: 'Consulta com Dr. Lucas',
          start: '2025-08-12T10:00:00'
        }
      ]
    });

    calendar.render();

    createBtnModal.addEventListener('click', function() {
      var title = eventTitleInput.value;
      var date = eventDateInput.value;
      var time = eventTimeInput.value;

      if (title && date && time) {
        calendar.addEvent({
          title: title,
          start: date + 'T' + time
        });
        eventTitleInput.value = '';
        eventTimeInput.value = '';
        modalContainer.classList.remove('active');
      }
    });

    closeBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        modalContainer.classList.remove('active');
      });
    });

    modalContainer.addEventListener('click', function(e) {
      if (e.target === modalContainer) {
        modalContainer.classList.remove('active');
      }
    });
  });