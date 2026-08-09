const STORAGE_KEY = 'flowlist-tasks-v1';
let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let filter = 'all';
let editingId = null;

const form = document.querySelector('#task-form');
const titleInput = document.querySelector('#task-title');
const descriptionInput = document.querySelector('#task-description');
const list = document.querySelector('#task-list');
const empty = document.querySelector('#empty-state');
const count = document.querySelector('#task-count');
const formTitle = document.querySelector('#form-title');
const submit = document.querySelector('#submit-button');
const cancel = document.querySelector('#cancel-edit');

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function dateText(value) { return new Intl.DateTimeFormat(undefined, { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(value)); }
function setToday() { const now = new Date(); document.querySelector('#today-weekday').textContent = new Intl.DateTimeFormat(undefined,{weekday:'long'}).format(now); document.querySelector('#today-date').textContent = String(now.getDate()).padStart(2,'0'); document.querySelector('#today-month').textContent = new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(now); }

function render() {
  const visible = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  list.innerHTML = '';
  visible.forEach(task => {
    const node = document.querySelector('#task-template').content.firstElementChild.cloneNode(true);
    node.dataset.id = task.id;
    node.classList.toggle('completed', task.completed);
    node.querySelector('.task-title').textContent = task.title;
    node.querySelector('.task-description').textContent = task.description;
    node.querySelector('.task-meta').textContent = task.completed ? `Completed ${dateText(task.completedAt)}` : `Created ${dateText(task.createdAt)}`;
    node.querySelector('.checkbox').setAttribute('aria-label', task.completed ? 'Mark task incomplete' : 'Mark task complete');
    list.append(node);
  });
  count.textContent = tasks.length;
  empty.classList.toggle('visible', visible.length === 0);
  empty.querySelector('h3').textContent = tasks.length ? 'No matching tasks' : 'Nothing here yet';
}

function resetForm() { editingId = null; form.reset(); formTitle.textContent = 'Add a task'; submit.innerHTML = 'Add task <span>→</span>'; cancel.classList.add('hidden'); }
form.addEventListener('submit', event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  if (editingId) { const task = tasks.find(item => item.id === editingId); task.title = title; task.description = descriptionInput.value.trim(); }
  else tasks.unshift({ id: crypto.randomUUID(), title, description: descriptionInput.value.trim(), createdAt: new Date().toISOString(), completed:false, completedAt:null });
  save(); resetForm(); render();
});
cancel.addEventListener('click', resetForm);
list.addEventListener('click', event => {
  const card = event.target.closest('.task-card'); if (!card) return;
  const task = tasks.find(item => item.id === card.dataset.id);
  if (event.target.closest('.checkbox')) { task.completed = !task.completed; task.completedAt = task.completed ? new Date().toISOString() : null; save(); render(); }
  if (event.target.closest('.delete-button')) { tasks = tasks.filter(item => item.id !== task.id); if (editingId === task.id) resetForm(); save(); render(); }
  if (event.target.closest('.edit-button')) { editingId = task.id; titleInput.value = task.title; descriptionInput.value = task.description; formTitle.textContent = 'Edit task'; submit.innerHTML = 'Save changes <span>→</span>'; cancel.classList.remove('hidden'); titleInput.focus(); window.scrollTo({top:0,behavior:'smooth'}); }
});
document.querySelector('.filters').addEventListener('click', event => { const button = event.target.closest('.filter'); if (!button) return; filter = button.dataset.filter; document.querySelectorAll('.filter').forEach(item => item.classList.toggle('active', item === button)); render(); });
setToday(); render();
