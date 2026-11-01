const data = document.getElementById('archive-data');
const list = document.getElementById('report-list');
const controls = document.getElementById('archive-controls');
const date = document.getElementById('archive-date');
const clear = document.getElementById('clear-date');
const count = document.getElementById('result-count');
const buttons = [...document.querySelectorAll('[data-type]')];
const labels = { ai: 'AI 早报', hach: 'HACH 日报' };
const reports = JSON.parse(data.textContent);
let selected = 'all';

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function render() {
  const matches = reports.filter(report => (selected === 'all' || report.type === selected) && (!date.value || report.date === date.value));
  buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.type === selected)));
  clear.hidden = !date.value;
  count.textContent = `共 ${matches.length} 份日报`;
  if (!matches.length) {
    const empty = element('div', 'empty-state', '');
    empty.append(element('h3', '', reports.length ? '没有符合条件的日报' : selected === 'all' ? '暂无日报' : `暂无${labels[selected]}`));
    empty.append(element('p', '', reports.length ? '试试其他栏目或日期。' : '日报发布后，将按日期展示在这里。'));
    empty.append(element('span', 'empty-caption', 'A NEW PAGE IS ON ITS WAY'));
    list.replaceChildren(empty);
    return;
  }
  list.replaceChildren(...matches.map(report => {
    const link = element('a', 'report-row', '');
    link.href = report.href;
    const time = element('time', 'report-date', report.date.slice(0, 7));
    time.dateTime = report.date;
    time.append(element('strong', '', report.date.slice(8)));
    const content = element('div', '', '');
    content.append(element('span', `report-kicker ${report.type}`, labels[report.type]), element('h3', '', report.title));
    if (report.summary) content.append(element('p', '', report.summary));
    const arrow = element('span', 'row-arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(time, content, arrow);
    return link;
  }));
}

controls.hidden = false;
buttons.forEach(button => button.addEventListener('click', () => { selected = button.dataset.type; render(); }));
document.querySelectorAll('[data-channel]').forEach(link => link.addEventListener('click', () => { selected = link.dataset.channel; render(); }));
date.addEventListener('change', render);
clear.addEventListener('click', () => { date.value = ''; render(); date.focus(); });
