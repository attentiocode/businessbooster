
let editIndex = null;

function renderGroups(filter='') {
  const tbody = document.getElementById('groupList');
  tbody.innerHTML = '';
  gGroupbedrifter
    .filter(g => g.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach((g, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${g.name}</td>
        <td>${g.user}</td>
        <td>${g.desc}</td>
        <td>
          <button class="btn secondary" onclick="editGroup(${i})">Rediger</button>
          <button class="btn danger" onclick="deleteGroup(${i})">Slett</button>
        </td>`;
      tbody.appendChild(tr);
    });
  localStorage.setItem('gGroupbedrifter', JSON.stringify(gGroupbedrifter));

  //oppdater gruppe selector
  loadGroupSelectors(gGroupbedrifter);

}

function loadGroupSelectors(data){

  //sinne alle gruppeSelector som er i denne klassen "group-selectors"
  const groupSelectors = document.querySelectorAll('.group-selectors');

  groupSelectors.forEach(selector => {
    //oppdater gruppe selector
    let currentValue = selector.value;
      selector.innerHTML = '<option value="ALL">Alle grupper</option>';
      data.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id || g.airtable || g.name;
        option.textContent = g.name;
        selector.appendChild(option);
      });
      selector.value = currentValue || 'ALL';

  });
}

function openGroupDialog() {
  editIndex = null;
  document.getElementById('dialogTitle').innerText = 'Ny gruppe';
  document.getElementById('groupName').value = '';
  document.getElementById('groupUser').value = userName || '';
  document.getElementById('groupDesc').value = '';
  document.getElementById('groupDialog').showModal();
}

function closeDialog() {
  document.getElementById('groupDialog').close();
}

function saveGroup() {
  const name = document.getElementById('groupName').value.trim();
  const user = document.getElementById('groupUser').value.trim();
  const desc = document.getElementById('groupDesc').value.trim();
  if (!name || !user) {
    alert('Fyll inn gruppenavn og brukernavn');
    return;
  }
  if (editIndex === null) {
    gGroupbedrifter.push({ id: Date.now(), name, user, desc });
    sendNewGroupToServer({ id: Date.now(), name, user, desc });
  } else {
    gGroupbedrifter[editIndex] = { ...gGroupbedrifter[editIndex], name, user, desc };
    updateNewGroupToServer(gGroupbedrifter[editIndex]);
  }
  renderGroups();
  closeDialog();
}

function editGroup(i) {
  editIndex = i;
  const g = gGroupbedrifter[i];
  document.getElementById('dialogTitle').innerText = 'Rediger gruppe';
  document.getElementById('groupName').value = g.name;
  document.getElementById('groupUser').value = g.user;
  document.getElementById('groupDesc').value = g.desc;
  document.getElementById('groupDialog').showModal();
}

function deleteGroup(i) {
  if (confirm('Vil du slette denne gruppen?')) {
    gGroupbedrifter.splice(i,1);
    renderGroups();
  }
}

document.getElementById('searchGroup').addEventListener('input', e => renderGroups(e.target.value));

//renderGroups();