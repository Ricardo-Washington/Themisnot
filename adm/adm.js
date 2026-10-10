// A inicialização do Firebase e o objeto `db` vêm agora do arquivo compartilhado global: /js/firebase-config-shared.js
    
    // Logout
function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = "/login/login.html";
    }).catch((error) => {
        console.error("Erro ao fazer logout:", error);
    });
}
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "/login/login.html";
        return;
    }

    try {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        const dados = userDoc.data();
        const atribuicao = dados ? dados.atribuicao : null;

        if (dados && (dados.nome || dados.nomeCompleto)) {
            const nomeExibicao = dados.nome || dados.nomeCompleto;
            const pNome = String(nomeExibicao).split(' ')[0];
            document.querySelectorAll('.user-greeting').forEach(el => el.textContent = 'Olá, ' + pNome);
        }

        if (atribuicao !== 'adm' && atribuicao !== 'admin') {
            alert('Você não tem permissão para acessar esta página.');
            window.location.href = '/home/home.html';
            return;
        }

        findUsers();
    } catch (error) {
        console.error('Erro ao verificar permissão de administrador:', error);
        window.location.href = '/login/login.html';
    }
});

let usuariosFuncionarios = [];
let usuariosProfessores = [];
let usuariosAlunos = [];
let cursosList = [];
let usuarioAtual = null;
let tipoAtual = null; 
let disciplinasProfessorDisponiveis = [];
let disciplinasCadastradasCache = [];
let disciplinasCatalogoNovoCurso = [];
let turmaEmEdicao = null;
let availabilityRefreshTimeout = null;
let ocultarDisponibilidadesConfirmadas = false;

const mobileMenuButton = document.getElementById('mobile-menu-btn');
const navigationLinks = document.getElementById('nav-links');

if (mobileMenuButton && navigationLinks) {
  mobileMenuButton.addEventListener('click', () => {
    const isExpanded = navigationLinks.classList.toggle('active');
    mobileMenuButton.setAttribute('aria-expanded', String(isExpanded));
    mobileMenuButton.innerHTML = `<i class="fa-solid ${isExpanded ? 'fa-xmark' : 'fa-bars'}"></i>`;
  });
  navigationLinks.addEventListener('click', event => {
    if (event.target.closest('a, button')) {
      navigationLinks.classList.remove('active');
      mobileMenuButton.setAttribute('aria-expanded', 'false');
      mobileMenuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
    }
  });
}

function formatarCpfAdm(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}

function formatarTelefoneAdm(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, (_, ddd, prefixo, sufixo) => {
      if (!sufixo) return `(${ddd}) ${prefixo}`;
      return `(${ddd}) ${prefixo}-${sufixo}`;
    });
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, ddd, prefixo, sufixo) => {
    if (!sufixo) return `(${ddd}) ${prefixo}`;
    return `(${ddd}) ${prefixo}-${sufixo}`;
  });
}

function aplicarMascarasUsuarioAdm() {
  const campos = [
    { id: 'editCpf', format: formatarCpfAdm },
    { id: 'editTelefone', format: formatarTelefoneAdm },
    { id: 'editTelefoneAlt', format: formatarTelefoneAdm }
  ];

  campos.forEach(({ id, format }) => {
    const input = document.getElementById(id);
    if (!input || input.dataset.mascaraAplicada === 'true') return;
    input.dataset.mascaraAplicada = 'true';
    input.addEventListener('input', () => {
      input.value = format(input.value);
    });
  });
}

function obterValorCampo(id, fallback = '') {
  const input = document.getElementById(id);
  if (!input) return fallback;
  const value = input.value ?? '';
  return typeof value === 'string' ? value.trim() : String(value).trim();
}

const adminSearch = document.getElementById('adminSearch');
const clearAdminSearch = document.getElementById('clearAdminSearch');
const searchStatus = document.getElementById('searchStatus');

function aplicarBuscaAdm() {
  const termo = adminSearch?.value.trim().toLocaleLowerCase('pt-BR') || '';
  const registros = Array.from(document.querySelectorAll('[data-search-record]'));
  let encontrados = 0;

  registros.forEach(registro => {
    const corresponde = !termo || registro.textContent.toLocaleLowerCase('pt-BR').includes(termo);
    const ocultoPorStatus = registro.dataset.approved === 'true' && ocultarDisponibilidadesConfirmadas;
    registro.hidden = !corresponde || ocultoPorStatus;
    if (corresponde && !ocultoPorStatus) encontrados += 1;
  });

  if (searchStatus) {
    searchStatus.textContent = termo
      ? `${encontrados} de ${registros.length} registros correspondem à pesquisa.`
      : `${registros.length} registros disponíveis para consulta.`;
  }
}

adminSearch?.addEventListener('input', aplicarBuscaAdm);
clearAdminSearch?.addEventListener('click', () => {
  if (!adminSearch) return;
  adminSearch.value = '';
  aplicarBuscaAdm();
  adminSearch.focus();
});

const disciplineFilterCourse = document.getElementById('disciplineFilterCourse');
disciplineFilterCourse?.addEventListener('change', () => {
  if (!disciplinasCadastradasCache.length) return;
  renderizarDisciplinasCadastradas();
});

const disciplineFilterProfessor = document.getElementById('disciplineFilterProfessor');
disciplineFilterProfessor?.addEventListener('change', () => {
  if (!disciplinasCadastradasCache.length) return;
  renderizarDisciplinasCadastradas();
});

const studentFilterCourse = document.getElementById('studentFilterCourse');
const studentFilterProfessor = document.getElementById('studentFilterProfessor');
studentFilterCourse?.addEventListener('change', renderizarAlunosPorCursoProfessor);
studentFilterProfessor?.addEventListener('change', renderizarAlunosPorCursoProfessor);

document.getElementById('hideApprovedAvailabilities')?.addEventListener('change', event => {
  ocultarDisponibilidadesConfirmadas = event.target.checked;
  document.querySelectorAll('#availability-admin-list .availability-admin-item').forEach(item => {
    item.hidden = ocultarDisponibilidadesConfirmadas && item.dataset.approved === 'true';
  });
  aplicarBuscaAdm();
  atualizarResumoDisponibilidades();
});

// A função principal para buscar e separar os dados
function findUsers() {
  firebase.firestore()
    .collection('usuarios')
    .get()
    .then(async snapshot => {
      const todosUsuarios = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));

      usuariosFuncionarios = todosUsuarios.filter(user => user.atribuicao === 'funcionario');
      usuariosProfessores = todosUsuarios.filter(user => user.atribuicao === 'professor');
      usuariosAlunos = todosUsuarios.filter(user => user.atribuicao === 'aluno' || user.atribuicao === 'Aluno');
      renderizarLista('dadosfuincionario', usuariosFuncionarios);
      renderizarLista('dadosprofessor', usuariosProfessores, 'professor');
      renderizarLista('dadosaluno', usuariosAlunos);
      fetchTeacherAvailabilities(todosUsuarios);
      // Atualiza o gráfico de inscrições mensais usando apenas os alunos
      renderarGraficoInscricoes(usuariosAlunos);

      try {
        await renderizarDisciplinasCadastradas();
        const coursesSnapshot = await db.collection('cursos').get();
        const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        await window.academicWorkflow.ensureCourseDisciplineRecords(db, courses);
        const disciplineSnapshot = await db.collection('disciplinas').get();
        const knownDisciplineIds = new Set(disciplineSnapshot.docs.map(doc => doc.id));
        await Promise.all(usuariosProfessores.map(async professor => {
          const migratedIds = new Set((professor.disciplinasIds || []).filter(id => knownDisciplineIds.has(id)));
          (professor.disciplinas || []).forEach(item => {
            const name = typeof item === 'string' ? item : item?.nome;
            if (name && knownDisciplineIds.has(window.academicWorkflow.disciplineId(name))) {
              migratedIds.add(window.academicWorkflow.disciplineId(name));
            }
          });
          (professor.disciplinasIds || []).forEach(oldId => {
            const matchingCourse = courses.find(course => String(oldId).startsWith(`${course.id}::`));
            if (!matchingCourse) return;
            const oldName = String(oldId).slice(matchingCourse.id.length + 2);
            const globalId = window.academicWorkflow.disciplineId(oldName);
            if (knownDisciplineIds.has(globalId)) migratedIds.add(globalId);
          });
          const disciplinasIds = [...migratedIds];
          const mustMigrate = JSON.stringify(disciplinasIds) !== JSON.stringify(professor.disciplinasIds || [])
            || Array.isArray(professor.disciplinas) || Array.isArray(professor.disciplinasKeys);
          if (!mustMigrate) return;
          await db.collection('usuarios').doc(professor.id).update({
            disciplinasIds,
            disciplinas: firebase.firestore.FieldValue.delete(),
            disciplinasKeys: firebase.firestore.FieldValue.delete()
          });
          professor.disciplinasIds = disciplinasIds;
        }));
        const coursesNeedingRosterSync = [...new Set(usuariosAlunos
          .filter(student => !student.rosterAtualizadoEm && student.cursoId)
          .map(student => student.cursoId))];
        await Promise.all(coursesNeedingRosterSync.map(courseId =>
          window.academicWorkflow.syncCourseStudentTeachers(firebase.firestore(), courseId)
        ));
        cursosList = courses;
        await renderizarDisciplinasCadastradas();
        popularFiltrosAlunosPorCursoProfessor();
        renderizarAlunosPorCursoProfessor();
      } catch (error) {
        console.error('As listas ADM foram carregadas, mas a migração acadêmica falhou:', error);
        const listaAlunos = document.getElementById('studentsByCourseProfessor');
        if (listaAlunos) {
          const item = document.createElement('li');
          item.className = 'item';
          item.textContent = 'Não foi possível carregar os cursos, professores ou disciplinas para gerar a lista.';
          listaAlunos.replaceChildren(item);
        }
      }
    })
    .catch(error => {
      console.error("Erro ao buscar usuários: ", error);
      mostrarEstadoLista('dadosfuincionario', 'Não foi possível carregar funcionários. Verifique a conexão e as permissões do Firestore.');
      mostrarEstadoLista('dadosprofessor', 'Não foi possível carregar professores. Verifique a conexão e as permissões do Firestore.');
      mostrarEstadoLista('dadosaluno', 'Não foi possível carregar alunos. Verifique a conexão e as permissões do Firestore.');
    });
  
  fetchCursos();
  fetchLogs(); // inicia a busca de logs
}

async function fetchTeacherAvailabilities(users) {
  const container = document.getElementById('availability-admin-list');
  if (!container) return;
  agendarLimpezaDisponibilidades(users);
  try {
    const [snapshot, coursesSnapshot] = await Promise.all([
      db.collection('disponibilidades').get(),
      db.collection('cursos').get()
    ]);
    const professorNames = new Map(users
      .filter(user => user.atribuicao === 'professor')
      .map(user => [user.id, user.nome || user.nomeCompleto || user.email || user.id]));
    const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const classesWithoutAvailability = new Set();
    const classEndDates = new Map();
    coursesSnapshot.docs.forEach(doc => {
      const course = doc.data() || {};
      (Array.isArray(course.turmas) ? course.turmas : []).forEach(classItem => {
        const classId = classItem.id || classItem.turmaId || '';
        const classKey = JSON.stringify([doc.id, classId]);
        if (course.status === 'finalizado' || ['cancelada', 'finalizada'].includes(classItem.status)) {
          classesWithoutAvailability.add(classKey);
        }
        classEndDates.set(classKey, classItem.dataTermino || classItem.dataFim || course.dataTermino || course.dataFim || '');
      });
    });
    const activeRecords = records.filter(record => {
      const classId = record.turmaId || '';
      const classKey = JSON.stringify([record.cursoId || '', classId]);
      if (classesWithoutAvailability.has(classKey)) return false;
      const endDate = classEndDates.get(classKey) || record.dataTermino || '';
      return !endDate || endDate >= obterDataLocalAtual();
    });
    renderTeacherAvailabilities(container, activeRecords, professorNames);
    renderGeneralScheduleReport(activeRecords, professorNames);
    await renderDeclinedAvailabilityRequests(professorNames, classesWithoutAvailability, classEndDates);
  } catch (error) {
    console.error('Erro ao carregar disponibilidades dos professores:', error);
    container.innerHTML = '<p class="item">Não foi possível carregar as disponibilidades. Verifique as permissões e tente novamente.</p>';
    const report = document.getElementById('generalScheduleReport');
    if (report) report.innerHTML = '<p class="item">Não foi possível carregar o relatório.</p>';
  }
}

function obterDataLocalAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function agendarLimpezaDisponibilidades(users) {
  if (availabilityRefreshTimeout) clearTimeout(availabilityRefreshTimeout);
  const proximaViradaDoDia = new Date();
  proximaViradaDoDia.setHours(24, 0, 1, 0);
  availabilityRefreshTimeout = setTimeout(
    () => fetchTeacherAvailabilities(users),
    proximaViradaDoDia.getTime() - Date.now()
  );
}

async function renderDeclinedAvailabilityRequests(professorNames, classesWithoutAvailability, classEndDates) {
  const container = document.getElementById('availability-declined-list');
  if (!container) return;
  container.textContent = '';
  const snapshot = await db.collection('notificacoes').where('status', '==', 'recusada').get();
  snapshot.docs.forEach(doc => {
    const request = doc.data();
    if (request.tipo !== 'solicitar_disponibilidade') return;
    const classKey = JSON.stringify([request.cursoId || '', request.turmaId || '']);
    if (classesWithoutAvailability.has(classKey)) return;
    const endDate = classEndDates.get(classKey) || request.dataTermino || '';
    if (endDate && endDate < obterDataLocalAtual()) return;
    const item = document.createElement('div');
    item.className = 'item availability-declined';
    const professor = professorNames.get(request.professorId) || request.professorId;
    const text = document.createElement('span');
    text.textContent = `${professor} não poderá lecionar ${request.disciplinaNome || 'a disciplina'} — ${request.cursoNome || 'Curso'}, Turma ${request.turmaId || 'sem identificação'}.${request.motivoRecusa ? ` Motivo: ${request.motivoRecusa}` : ''}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Ciente';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await doc.ref.update({ status: 'recusada_ciente' });
        item.remove();
      } catch (error) {
        console.error('Erro ao marcar recusa como vista:', error);
        button.disabled = false;
        showToast('Não foi possível atualizar a recusa.', 'error');
      }
    });
    item.append(text, button);
    container.appendChild(item);
  });
}

function teacherAvailabilityApproved(record) {
  return !record.status || record.status === 'aprovada';
}

const availabilityWeekdays = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' }
];

function formatAvailabilityDays(days = []) {
  return days
    .map(day => availabilityWeekdays.find(item => item.value === Number(day))?.label)
    .filter(Boolean)
    .join(', ');
}

function formatAvailabilityDates(dates = []) {
  return dates
    .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .map(date => {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    })
    .join(', ');
}

function availabilityDaysOverlap(first, second) {
  const firstDays = Array.isArray(first.diasSemana) ? first.diasSemana : [];
  const secondDays = Array.isArray(second.diasSemana) ? second.diasSemana : [];
  return !firstDays.length || !secondDays.length || firstDays.some(day => secondDays.includes(day));
}

function teacherAvailabilityOverlaps(first, second) {
  return first.cursoId === second.cursoId
    && (first.turmaId === second.turmaId || first.professorId === second.professorId)
    && dataRangesOverlap(first, second)
    && availabilityDaysOverlap(first, second)
    && first.horarioInicio < second.horarioTermino
    && first.horarioTermino > second.horarioInicio;
}

function dataRangesOverlap(first, second) {
  return first.dataInicio <= second.dataTermino && first.dataTermino >= second.dataInicio;
}

function renderTeacherAvailabilities(container, records, professorNames) {
  container.textContent = '';
  if (!records.length) {
    const empty = document.createElement('p');
    empty.className = 'item';
    empty.textContent = 'Nenhuma disponibilidade de turmas em andamento ou futuras.';
    container.appendChild(empty);
    atualizarResumoDisponibilidades();
    return;
  }

  records.sort((first, second) => Number(teacherAvailabilityApproved(first)) - Number(teacherAvailabilityApproved(second)));
  records.forEach(record => {
    const conflicts = records.filter(other =>
      other.id !== record.id && teacherAvailabilityOverlaps(record, other)
    );
    const approved = teacherAvailabilityApproved(record);
    const article = document.createElement('article');
    article.className = `availability-admin-item${conflicts.length ? ' has-conflict' : ''}`;
    article.dataset.searchRecord = '';
    article.dataset.courseId = record.cursoId || '';
    article.dataset.approved = String(approved);
    article.hidden = ocultarDisponibilidadesConfirmadas && approved;
    const status = approved ? 'Aprovada e reservada' : 'Aguardando revisão';
    const conflictMessage = conflicts.length
      ? `Conflito com ${conflicts.map(item => professorNames.get(item.professorId) || 'outro professor').join(', ')}.`
      : 'Sem conflito de horário detectado.';
    const submittedDays = Array.isArray(record.diasDisponiveis)
      ? record.diasDisponiveis
      : Array.isArray(record.diasSemana) ? record.diasSemana : [];
    const submittedDates = Array.isArray(record.datasDisponiveis)
      ? record.datasDisponiveis
      : [];
    const selectedDays = Array.isArray(record.diasSemana) ? record.diasSemana : [];
    const dayOptions = availabilityWeekdays.map(day => `
      <label>
        <input type="checkbox" name="diasSemana" value="${day.value}" ${selectedDays.includes(day.value) ? 'checked' : ''} ${submittedDays.length && !submittedDays.includes(day.value) ? 'disabled' : ''}>
        ${day.label}
      </label>`).join('');
    article.innerHTML = `
      <div class="availability-admin-heading">
        <div>
          <span class="availability-status ${approved ? 'approved' : 'pending'}">${status}</span>
          <h3>${escapeHtml(professorNames.get(record.professorId) || 'Professor não identificado')}</h3>
          <p>${escapeHtml(record.cursoNome || 'Curso')} · Turma ${escapeHtml(record.turmaId || 'sem identificação')} · ${escapeHtml(record.disciplinaNome || 'Disciplina')}</p>
          <p>Disponibilidade informada: ${escapeHtml(formatAvailabilityDays(submittedDays) || 'dias não informados')} · ${escapeHtml(record.horarioInicio || '--')} às ${escapeHtml(record.horarioTermino || '--')}</p>
          <p>Datas em que informou disponibilidade: ${escapeHtml(formatAvailabilityDates(submittedDates) || 'não registradas')}</p>
        </div>
        <p class="availability-conflict-message">${escapeHtml(conflictMessage)}</p>
      </div>
      <form class="availability-admin-form" data-availability-id="${escapeHtml(record.id)}">
        <fieldset>
          <legend>Dias em que o professor pode lecionar</legend>
          <div class="availability-admin-days">${dayOptions}</div>
          <p class="discipline-help">Marque os dias finais da turma entre as disponibilidades informadas.</p>
        </fieldset>
        <div class="availability-admin-fields">
          <label>Data de início<input type="date" name="dataInicio" value="${escapeHtml(record.dataInicio || '')}" required></label>
          <label>Data de término<input type="date" name="dataTermino" value="${escapeHtml(record.dataTermino || '')}" required></label>
          <label>Horário inicial<input type="time" name="horarioInicio" value="${escapeHtml(record.horarioInicio || '')}" required></label>
          <label>Horário final<input type="time" name="horarioTermino" value="${escapeHtml(record.horarioTermino || '')}" required></label>
        </div>
        <div class="availability-admin-actions">
          <button class="item-edit-button" type="submit" data-action="save">Salvar alterações</button>
          ${approved ? '' : '<button class="item-edit-button approve-availability-button" type="submit" data-action="approve">Salvar e aprovar</button>'}
          <span class="availability-admin-feedback" aria-live="polite"></span>
        </div>
      </form>`;
    article.querySelector('form').addEventListener('submit', revisarDisponibilidadeProfessor);
    container.appendChild(article);
  });
  aplicarBuscaAdm();
  atualizarResumoDisponibilidades();
}

function atualizarResumoDisponibilidades() {
  const summary = document.getElementById('availabilityAdminSummary');
  const items = Array.from(document.querySelectorAll('#availability-admin-list .availability-admin-item'));
  if (!summary) return;
  const confirmadas = items.filter(item => item.dataset.approved === 'true').length;
  const pendentes = items.length - confirmadas;
  summary.textContent = `${confirmadas} confirmada(s) · ${pendentes} pendente(s)`;
}

function renderGeneralScheduleReport(records, professorNames) {
  const container = document.getElementById('generalScheduleReport');
  if (!container) return;
  const approvedRecords = records
    .filter(teacherAvailabilityApproved)
    .sort((first, second) => {
      const firstDate = first.datasDisponiveis?.[0] || first.dataInicio || '';
      const secondDate = second.datasDisponiveis?.[0] || second.dataInicio || '';
      return firstDate.localeCompare(secondDate)
        || String(professorNames.get(first.professorId) || '').localeCompare(String(professorNames.get(second.professorId) || ''));
    });

  if (!approvedRecords.length) {
    container.innerHTML = '<p class="item">Nenhum horário confirmado para o período atual.</p>';
    return;
  }

  const rows = approvedRecords.map(record => {
    const dates = formatAvailabilityDates(record.datasDisponiveis || []);
    const days = formatAvailabilityDays(record.diasSemana || []);
    const period = dates || `${record.dataInicio || '--'} a ${record.dataTermino || '--'}`;
    const dayInfo = days ? ` (${days})` : '';
    return `<tr>
      <td>${escapeHtml(professorNames.get(record.professorId) || 'Professor não identificado')}</td>
      <td>${escapeHtml(record.cursoNome || 'Curso')} · Turma ${escapeHtml(record.turmaId || 'sem identificação')}</td>
      <td>${escapeHtml(record.disciplinaNome || 'Disciplina')}</td>
      <td>${escapeHtml(period + dayInfo)}</td>
      <td>${escapeHtml(`${record.horarioInicio || '--'} às ${record.horarioTermino || '--'}`)}</td>
    </tr>`;
  }).join('');

  container.innerHTML = `<div class="schedule-report-table-wrap"><table class="schedule-report-table">
    <thead><tr><th>Professor</th><th>Curso e turma</th><th>Disciplina</th><th>Data(s)</th><th>Horário</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

async function revisarDisponibilidadeProfessor(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const feedback = form.querySelector('.availability-admin-feedback');
  const action = event.submitter?.dataset.action || 'save';
  const horarioInicio = form.elements.horarioInicio.value;
  const horarioTermino = form.elements.horarioTermino.value;
  const dataInicio = form.elements.dataInicio.value;
  const dataTermino = form.elements.dataTermino.value;
  const diasSemana = Array.from(form.querySelectorAll('input[name="diasSemana"]:checked'))
    .map(input => Number(input.value));
  feedback.textContent = '';

  if (!diasSemana.length || horarioInicio >= horarioTermino || dataInicio > dataTermino) {
    feedback.textContent = 'Selecione ao menos um dia e revise os horários e datas informados.';
    return;
  }

  form.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try {
    const availabilityId = form.dataset.availabilityId;
    const availabilityRef = db.collection('disponibilidades').doc(availabilityId);
    const courseSnapshot = await db.collection('disponibilidades')
      .where('cursoId', '==', form.closest('.availability-admin-item').dataset.courseId)
      .get();
    const courseAvailabilityRefs = courseSnapshot.docs
      .filter(doc => doc.id !== availabilityId)
      .map(doc => doc.ref);
    const currentSnapshot = await availabilityRef.get();
    const currentData = currentSnapshot.exists ? currentSnapshot.data() : null;
    const relatedNotificationRefs = currentData && (action === 'approve' || teacherAvailabilityApproved(currentData))
      ? (await db.collection('notificacoes')
        .where('cursoId', '==', currentData.cursoId)
        .where('disciplinaKey', '==', currentData.disciplinaKey)
        .where('status', '==', 'pendente')
        .get()).docs.map(doc => doc.ref)
      : [];

    await db.runTransaction(async transaction => {
      const availabilitySnapshot = await transaction.get(availabilityRef);
      if (!availabilitySnapshot.exists) {
        throw new Error('Esta disponibilidade não existe mais. Atualize a página.');
      }
      const current = availabilitySnapshot.data();
      const availableDays = Array.isArray(current.diasDisponiveis)
        ? current.diasDisponiveis
        : Array.isArray(current.diasSemana) ? current.diasSemana : [];
      if (availableDays.length && diasSemana.some(day => !availableDays.includes(day))) {
        throw new Error('A administração só pode confirmar dias informados pelo professor.');
      }
      const courseAvailabilitySnapshots = await Promise.all(
        courseAvailabilityRefs.map(ref => transaction.get(ref))
      );
      const approved = action === 'approve' || teacherAvailabilityApproved(current);
      const updated = {
        ...current,
        diasSemana,
        horarioInicio,
        horarioTermino,
        dataInicio,
        dataTermino
      };
      const conflictingRecord = approved && courseAvailabilitySnapshots
        .filter(snapshot => snapshot.exists)
        .map(snapshot => snapshot.data())
        .find(existing => teacherAvailabilityApproved(existing)
          && (existing.disciplinaKey === current.disciplinaKey
            || teacherAvailabilityOverlaps(updated, existing)));
      if (conflictingRecord) {
        throw new Error('Esta disciplina já tem um professor aprovado ou o horário conflita com outra aula do curso.');
      }

      const relatedNotifications = approved
        ? (await Promise.all(relatedNotificationRefs.map(ref => transaction.get(ref))))
          .filter(snapshot => snapshot.exists && snapshot.data().status === 'pendente')
        : [];

      transaction.update(availabilityRef, {
        diasSemana,
        horarioInicio,
        horarioTermino,
        dataInicio,
        dataTermino,
        status: approved ? 'aprovada' : 'aguardando_adm',
        atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        revisadoEm: firebase.firestore.FieldValue.serverTimestamp(),
        revisadoPor: firebase.auth().currentUser.uid
      });

      if (approved) {
        relatedNotifications
          .filter(doc => doc.id !== availabilityId && doc.data().professorId !== current.professorId)
          .forEach(doc => {
            transaction.update(doc.ref, {
              status: 'cancelada',
              canceladaEm: firebase.firestore.FieldValue.serverTimestamp(),
              motivoCancelamento: 'Disponibilidade aprovada por outro professor na mesma disciplina.'
            });
          });
      }

    });
    let rosterSyncError = null;
    if (action === 'approve') {
      try {
        await window.academicWorkflow.syncCourseStudentTeachers(db, form.closest('.availability-admin-item').dataset.courseId);
      } catch (error) {
        rosterSyncError = error;
        console.error('Horário aprovado, mas não foi possível atualizar os vínculos dos alunos:', error);
      }
    }
    if (rosterSyncError) {
      feedback.textContent = 'Horário aprovado, mas não foi possível atualizar os vínculos dos alunos. Tente sincronizar novamente.';
      showToast(feedback.textContent, 'error');
    } else {
      showToast(action === 'approve' ? 'Disponibilidade aprovada e horário reservado.' : 'Alterações salvas.', 'success');
    }
    fetchTeacherAvailabilities([
      ...usuariosFuncionarios,
      ...usuariosProfessores,
      ...usuariosAlunos
    ]);
  } catch (error) {
    console.error('Erro ao revisar disponibilidade:', error);
    feedback.textContent = error.message || 'Não foi possível salvar a disponibilidade.';
    showToast(feedback.textContent, 'error');
    form.querySelectorAll('button').forEach(button => { button.disabled = false; });
  }
}

function fetchLogs() {
  firebase.firestore()
    .collection('logs_auditoria')
    .orderBy('timestamp', 'desc')
    .limit(30)
    .get()
    .then(snapshot => {
      const logsList = snapshot.docs.map(doc => doc.data());
      renderizarLogs('dadosauditoria', logsList);
    })
    .catch(error => {
      console.error("Erro ao buscar logs: ", error);
    });
}

function fetchCursos() {//busca os cursos no fire base 
  firebase.firestore()
    .collection('cursos')
    .get()
    .then(async snapshot => {
      cursosList = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
      if (cursosList.length === 0) {
        initCursos();
      } else {
        renderizarCursos('dadoscursos', cursosList);//renderiza os cursos
        renderizarTurmasEmVigor(cursosList);
        try {
          await sincronizarDisciplinasPadrao(cursosList);
          const latestSnapshot = await firebase.firestore().collection('cursos').get();
          cursosList = latestSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          await window.academicWorkflow.ensureCourseDisciplineRecords(firebase.firestore(), cursosList);
          cursosList = cursosList.map(course => ({
            ...course,
            disciplinas: (course.disciplinas || []).map(subject => ({
              id: window.academicWorkflow.subjectId(subject),
              nome: typeof subject === 'string' ? subject : subject.nome
            }))
          }));
          renderizarCursos('dadoscursos', cursosList);
          renderizarTurmasEmVigor(cursosList);
          await renderizarDisciplinasCadastradas();
        } catch (error) {
          console.error('Cursos exibidos sem concluir a sincronização de disciplinas:', error);
        }
      }
    })
    .catch(error => {
      console.error("Erro ao buscar cursos: ", error);//tratamento de erro 
      mostrarEstadoLista('dadoscursos', 'Não foi possível carregar cursos. Verifique a conexão e as permissões do Firestore.');
    });
}

function renderizarTurmasEmVigor(cursos) {
  const lista = document.getElementById('turmasEmVigor');
  if (!lista) return;
  lista.innerHTML = '';

  const formatarData = valor => valor ? valor.split('-').reverse().join('/') : '-';
  const turmasAtivas = [];
  cursos.filter(curso => curso.status === 'em_vigor').forEach(curso => {
    (Array.isArray(curso.turmas) ? curso.turmas : [])
      .filter(turma => !['cancelada', 'finalizada'].includes(turma.status))
      .forEach(turma => turmasAtivas.push({ curso, turma }));
  });

  if (!turmasAtivas.length) {
    const vazio = document.createElement('li');
    vazio.className = 'item';
    vazio.textContent = 'Nenhuma turma cadastrada.';
    lista.appendChild(vazio);
    return;
  }

  turmasAtivas.forEach(({ curso, turma }) => {
    const item = document.createElement('li');
    item.className = 'item';
    const turmaId = turma.id || turma.turmaId || '';
    const descricao = document.createElement('p');
    descricao.textContent = `${curso.nome || curso.id} — Turma ${turmaId || 'sem identificação'} | Turno: ${turma.turno || '-'} | ${formatarData(turma.dataInicio)} a ${formatarData(turma.dataTermino)}`;
    item.appendChild(descricao);

    if (turmaId) {
      const acoes = document.createElement('div');
      acoes.className = 'class-list-actions';

      const editarButton = document.createElement('button');
      editarButton.type = 'button';
      editarButton.className = 'details-button compact-action-button';
      editarButton.textContent = 'Editar turma';
      editarButton.setAttribute('aria-label', `Editar turma ${turmaId}`);
      editarButton.addEventListener('click', () => abrirEdicaoTurma(curso, turma));

      const excluirButton = document.createElement('button');
      excluirButton.type = 'button';
      excluirButton.className = 'details-button compact-action-button';
      excluirButton.textContent = 'Excluir turma';
      excluirButton.setAttribute('aria-label', `Excluir turma ${turmaId}`);
      excluirButton.addEventListener('click', () => excluirTurmaDaLista(curso, turmaId));

      acoes.append(editarButton, excluirButton);
      item.appendChild(acoes);
    }
    lista.appendChild(item);
  });
}

function abrirEdicaoTurma(curso, turma) {
  turmaEmEdicao = {
    cursoId: curso.id,
    cursoNome: curso.nome || curso.id,
    turmaId: turma.id || turma.turmaId
  };
  document.getElementById('editClassCourseName').textContent = `Curso: ${turmaEmEdicao.cursoNome}`;
  document.getElementById('editClassId').value = turmaEmEdicao.turmaId;
  document.getElementById('editClassShift').value = turma.turno || '';
  document.getElementById('editClassStart').value = turma.dataInicio || '';
  document.getElementById('editClassEnd').value = turma.dataTermino || turma.dataFim || '';
  document.getElementById('editClassModal').style.display = 'flex';
  document.getElementById('editClassShift').focus();
}

function fecharEdicaoTurma() {
  document.getElementById('editClassModal').style.display = 'none';
  document.getElementById('editClassForm').reset();
  turmaEmEdicao = null;
}

function mostrarEstadoLista(idDaLista, mensagem) {
  const lista = document.getElementById(idDaLista);
  if (!lista) return;
  const item = document.createElement('li');
  item.className = 'item';
  item.textContent = mensagem;
  lista.replaceChildren(item);
}

const disciplinasPorCursoPadrao = {
  vigilante: [
    'Noções de Segurança Privada', 'Legislação Aplicada e Direitos Humanos',
    'Relações Humanas no Trabalho', 'Sistema de Segurança Pública e Crime Organizado',
    'Prevenção e Combate a Incêndios', 'Primeiros Socorros', 'Educação Física',
    'Defesa Pessoal', 'Armamento e Tiro', 'Vigilância', 'Radiocomunicação e Alarmes',
    'Noções de Segurança Eletrônica', 'Uso Progressivo da Força', 'Gerenciamento de Crises'
  ],
  escoltaArmada: [
    'Legislação Aplicada', 'Escolta Armada', 'Resolução de Situações de Emergência',
    'Armamento e Tiro', 'Verificação de Aprendizagem'
  ],
  armasNaoLetais: [
    'Uso Progressivo da Força', 'Agentes Químicos e Espargidores',
    'Armas de Condutividade Elétrica', 'Primeiros Socorros'
  ],
  reciclagem: [
    'Revisão e Atualização das Disciplinas Básicas', 'Armamento e Tiro',
    'Relações Humanas no Trabalho', 'Prevenção e Combate a Incêndios',
    'Primeiros Socorros', 'Defesa Pessoal'
  ],
  grandesEventos: [
    'Papel do Vigilante na Estrutura de Segurança em Recintos de Grandes Eventos',
    'Controle de Acesso', 'Gerenciamento de Público',
    'Gestão de Multidões e Manutenção de Ambiente Seguro',
    'Resolução de Situações de Emergência', 'Disciplinas Complementares'
  ]
};

function disciplinasDoCursoPadrao(curso) {
  const identificador = `${curso.id || ''} ${curso.nome || ''}`.toLowerCase();
  if (curso.id === 'vigilante' || identificador.includes('formação básica de vigilante') || identificador.includes('curso de vigilante')) {
    return disciplinasPorCursoPadrao.vigilante;
  }
  if (curso.id === 'escoltaArm' || identificador.includes('escolta armada')) {
    return disciplinasPorCursoPadrao.escoltaArmada;
  }
  if (curso.id === 'armasNaoLetais' || identificador.includes('armas não letais') || identificador.includes('armamento não letal')) {
    return disciplinasPorCursoPadrao.armasNaoLetais;
  }
  if (curso.id === 'Reciclagem' || identificador.includes('reciclagem')) {
    return disciplinasPorCursoPadrao.reciclagem;
  }
  if (curso.id === 'grandesEventos' || identificador.includes('grandes eventos')) {
    return disciplinasPorCursoPadrao.grandesEventos;
  }
  return null;
}

async function sincronizarDisciplinasPadrao(cursos) {
  const batch = firebase.firestore().batch();
  let alteracoes = 0;
  cursos.forEach(curso => {
    const disciplinas = disciplinasDoCursoPadrao(curso);
    if (!disciplinas || (Array.isArray(curso.disciplinas) && curso.disciplinas.length)) return;
    batch.update(firebase.firestore().collection('cursos').doc(curso.id), { disciplinas });
    alteracoes += 1;
  });
  if (alteracoes) await batch.commit();
}

// Variável global para manter o gráfico vivo entre atualizações.
let inscricoesChart = null;

// Nomes dos meses em português para exibir na escala X do gráfico.
const monthNamesPT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Gera os rótulos dos últimos meses.
 * Exemplo: ["Nov 2025", "Dez 2025", "Jan 2026", "Fev 2026", "Mar 2026", "Abr 2026"]
 */
function gerarUltimosMeses(qtd = 6) {
  const meses = [];
  const hoje = new Date();
  for (let i = qtd - 1; i >= 0; i--) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    meses.push(`${monthNamesPT[data.getMonth()]} ${data.getFullYear()}`);
  }
  return meses;
}

/**
 * Conta quantos alunos foram cadastrados em cada mês exibido no gráfico.
 * Recebe a lista de alunos e os labels de mês já gerados.
 */
function contarInscricoesPorMes(alunos, labels) {
  const contagem = labels.map(() => 0);
  alunos.forEach(aluno => {
    const dataCadastro = aluno.dataCadastro;
    if (!dataCadastro) return;

    let data = null;
    if (typeof dataCadastro === 'string') {
      data = new Date(dataCadastro);
    } else if (dataCadastro.toDate) {
      data = dataCadastro.toDate();
    }

    if (!data || isNaN(data.getTime())) return;

    const mesLabel = `${monthNamesPT[data.getMonth()]} ${data.getFullYear()}`;
    const index = labels.indexOf(mesLabel);
    if (index !== -1) contagem[index] += 1;
  });
  return contagem;
}

/**
 * Cria ou atualiza o gráfico de barras com as inscrições mensais.
 * Se o gráfico já existir, apenas atualiza os dados.
 */
function renderarGraficoInscricoes(alunos) {
  const labels = gerarUltimosMeses(6);
  const valores = contarInscricoesPorMes(alunos, labels);
  const ctx = document.getElementById('inscricoesChart');
  if (!ctx) return;

  if (inscricoesChart) {
    inscricoesChart.data.labels = labels;
    inscricoesChart.data.datasets[0].data = valores;
    inscricoesChart.update();
    return;
  }

  inscricoesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alunos inscritos',
        data: valores,
        backgroundColor: 'rgba(255, 94, 0, 0.85)',
        borderColor: 'rgba(255, 158, 0, 1)',
        borderWidth: 1,
        borderRadius: 12,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${context.parsed.y} aluno(s)`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#f0f0f0' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.10)' },
          ticks: { color: '#f0f0f0', stepSize: 1 }
        }
      }
    }
  });
}
//função para iniciar os cursos caso não exista
function initCursos() {
    const cursosPadrao = [
    { id: "armasNaoLetais", nome: "Extensão ou Aperfeiçoamento em Armas Não Letais", preco: "500,00", cargaHoraria: "80 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.armasNaoLetais },
        { id: "Reciclagem", nome: "Reciclagem de Vigilantes", preco: "300,00", cargaHoraria: "40 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.reciclagem },
    { id: "escoltaArm", nome: "Escolta Armada", preco: "600,00", cargaHoraria: "50 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.escoltaArmada },
        { id: "grandesEventos", nome: "Curso de Extensão em Segurança para Grandes Eventos", preco: "450,00", cargaHoraria: "60 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.grandesEventos },
    { id: "vigilante", nome: "Vigilante", preco: "800,00", cargaHoraria: "200 horas", proximaTurma: "A definir", disciplinas: disciplinasPorCursoPadrao.vigilante }
    ];

    const batch = firebase.firestore().batch();
    cursosPadrao.forEach(curso => {
        const docRef = firebase.firestore().collection('cursos').doc(curso.id);
        batch.set(docRef, curso);
    });

    batch.commit().then(() => {
        fetchCursos();
    }).catch(error => console.error(error));
}

// A função reutilizável para renderizar a lista (Com proteção XSS)
function renderizarLista(idDaLista, dados, tipo = '') {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

  if (dados.length === 0) {
    const vazio = document.createElement('li');
    vazio.classList.add('item');
    vazio.textContent = tipo === 'professor' ? 'Nenhum professor cadastrado.' : 'Nenhum cadastro encontrado.';
    lista.appendChild(vazio);
    aplicarBuscaAdm();
    return;
  }

  dados.forEach(usuario => {
    const li = document.createElement('li');
    li.classList.add('item');
    li.setAttribute('data-search-record', '');

    const nome = document.createElement('p');
    const nomeStrong = document.createElement('strong');
    nomeStrong.textContent = 'Nome: ';
    nome.appendChild(nomeStrong);
    nome.appendChild(document.createTextNode(usuario.nome));
    li.appendChild(nome);

    const cpf = document.createElement('p');
    const cpfStrong = document.createElement('strong');
    cpfStrong.textContent = 'CPF: ';
    cpf.appendChild(cpfStrong);
    cpf.appendChild(document.createTextNode(usuario.cpf));
    li.appendChild(cpf);

    const atribuicao = document.createElement('p');
    const atribStrong = document.createElement('strong');
    atribStrong.textContent = 'Atribuição: ';
    atribuicao.appendChild(atribStrong);
    atribuicao.appendChild(document.createTextNode(usuario.atribuicao));
    li.appendChild(atribuicao);

    if (tipo === 'professor') {
      const editar = document.createElement('button');
      editar.type = 'button';
      editar.classList.add('item-edit-button');
      editar.textContent = 'Editar professor';
      editar.addEventListener('click', () => openModal('professor', usuario.id));
      li.appendChild(editar);
    }

    lista.appendChild(li);
  });
  aplicarBuscaAdm();
}

function renderizarCursos(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';

  dados.forEach(curso => {
    const li = document.createElement('li');
    li.classList.add('item');
    li.setAttribute('data-search-record', '');

    const nome = document.createElement('p');
    nome.innerHTML = `<strong>Curso:</strong> ${curso.nome}`;
    li.appendChild(nome);

    const disciplinas = document.createElement('p');
    const nomesDisciplinas = (curso.disciplinas || []).map(item => typeof item === 'string' ? item : item.nome).filter(Boolean);
    disciplinas.textContent = `Disciplinas: ${nomesDisciplinas.join(', ') || 'nenhuma vinculada'}`;
    li.appendChild(disciplinas);

    const detalhes = document.createElement('p');
    detalhes.textContent = `Preço: R$ ${curso.preco} | C. Horária: ${curso.cargaHoraria || curso.cargaHr || '--'}`;
    li.appendChild(detalhes);

    const status = document.createElement('p');
    status.textContent = `Status: ${curso.status === 'em_vigor' ? 'Em turma' : curso.status === 'finalizado' ? 'Finalizado' : 'Sem turma'}`;
    li.appendChild(status);

    if (curso.status === 'em_vigor') {
      const startNewClassButton = document.createElement('button');
      startNewClassButton.type = 'button';
      startNewClassButton.classList.add('details-button', 'compact-action-button');
      startNewClassButton.textContent = 'Nova turma';
      startNewClassButton.addEventListener('click', () => openModal('curso', curso.id, true));
      li.appendChild(startNewClassButton);
    }

    if (curso.status !== 'em_vigor' && curso.status !== 'finalizado') {
      const newClassButton = document.createElement('button');
      newClassButton.type = 'button';
      newClassButton.classList.add('details-button', 'compact-action-button');
      newClassButton.textContent = 'Nova turma';
      newClassButton.addEventListener('click', () => openModal('curso', curso.id, true));
      li.appendChild(newClassButton);
    }

    lista.appendChild(li);
  });
  aplicarBuscaAdm();
}

async function limparDisponibilidadesDoCurso(courseId, turmaId = null, motivoCancelamento = null) {
  const [availabilitySnapshot, notificationSnapshot] = await Promise.all([
    db.collection('disponibilidades').where('cursoId', '==', courseId).get(),
    db.collection('notificacoes').where('cursoId', '==', courseId).get()
  ]);
  const daTurma = doc => turmaId === null || (doc.data()?.turmaId || '') === turmaId;

  await Promise.all([
    ...availabilitySnapshot.docs.filter(daTurma).map(doc => doc.ref.delete()),
    ...notificationSnapshot.docs
      .filter(daTurma)
      .filter(doc => doc.data()?.status !== 'cancelada')
      .map(doc => doc.ref.update({
        status: 'cancelada',
        canceladaEm: firebase.firestore.FieldValue.serverTimestamp(),
        motivoCancelamento: motivoCancelamento
          || (turmaId === null ? 'Curso removido da vigência.' : 'Datas da turma adiadas.')
      }))
  ]);
}

async function adiarTurmaDoCurso(courseId, turmaId, novoInicio, novoTermino) {
  const courseRef = db.collection('cursos').doc(courseId);
  const courseSnapshot = await courseRef.get();
  if (!courseSnapshot.exists) throw new Error('Curso não encontrado.');
  const course = { id: courseSnapshot.id, ...courseSnapshot.data() };
  if (course.status !== 'em_vigor') throw new Error('Só é possível adiar turmas de cursos em vigor.');

  const turmas = Array.isArray(course.turmas) ? course.turmas : [];
  const turma = turmas.find(item => (item.id || item.turmaId) === turmaId);
  if (!turma) throw new Error('Turma não encontrada.');
  const inicioAtual = turma.dataInicio || course.dataInicio || '';
  const terminoAtual = turma.dataTermino || turma.dataFim || course.dataTermino || course.dataFim || '';
  if (!novoInicio || !novoTermino || novoTermino < novoInicio) {
    throw new Error('Informe datas válidas de início e término.');
  }
  if (novoInicio < inicioAtual || novoTermino < terminoAtual) {
    throw new Error('As novas datas não podem ser anteriores às atuais.');
  }
  const inicioMudou = novoInicio !== inicioAtual;
  if (!inicioMudou && novoTermino === terminoAtual) throw new Error('Nenhuma data foi alterada.');

  const courseLevelMatches = course.dataInicio === inicioAtual && course.dataTermino === terminoAtual;
  await courseRef.update({
    turmas: turmas.map(item => (item.id || item.turmaId) === turmaId
      ? { ...item, dataInicio: novoInicio, dataTermino: novoTermino }
      : item),
    ...(courseLevelMatches ? { dataInicio: novoInicio, dataTermino: novoTermino } : {})
  });

  const studentsSnapshot = await db.collection('usuarios')
    .where('cursoId', '==', courseId)
    .where('turmaId', '==', turmaId)
    .get();
  await Promise.all(studentsSnapshot.docs
    .filter(doc => ['aluno', 'Aluno'].includes(doc.data().atribuicao))
    .map(doc => doc.ref.update({ dataInicio: novoInicio, dataTermino: novoTermino })));

  let notificationsCreated = 0;
  if (inicioMudou) await limparDisponibilidadesDoCurso(courseId, turmaId);
  const updatedSnapshot = await courseRef.get();
  notificationsCreated = await window.academicWorkflow.notifyCourseProfessors(db, courseId, { id: updatedSnapshot.id, ...updatedSnapshot.data() });
  await window.academicWorkflow.syncCourseStudentTeachers(db, courseId);

  if (window.registrarLogAudit) registrarLogAudit(`Adiou a turma ${turmaId} do Curso: ${course.nome || courseId}`, 'adm', {
    cursoId: courseId, turmaId, inicioAtual, terminoAtual, novoInicio, novoTermino
  });
  showToast(inicioMudou
    ? `Turma adiada. Disponibilidades apagadas e ${notificationsCreated} nova(s) solicitação(ões) enviada(s).`
    : 'Término da turma adiado.', 'success');
  fetchCursos();
  fetchLogs();
}

function prepararPainelAdiamento(curso) {
  const painel = document.getElementById('postponeCourseFields');
  if (!painel) return;
  const turmasAtivas = (Array.isArray(curso?.turmas) ? curso.turmas : [])
    .filter(turma => !['cancelada', 'finalizada'].includes(turma.status));
  painel.style.display = curso?.status === 'em_vigor' && turmasAtivas.length ? 'block' : 'none';
  const select = document.getElementById('postponeTurma');
  select.innerHTML = '';
  turmasAtivas.forEach(turma => {
    const option = document.createElement('option');
    option.value = turma.id || turma.turmaId;
    option.textContent = `${option.value} (${turma.dataInicio || '-'} a ${turma.dataTermino || '-'})`;
    select.appendChild(option);
  });
  preencherDatasAdiamento(curso);
}

function preencherDatasAdiamento(curso) {
  const turmaId = document.getElementById('postponeTurma').value;
  const turma = (Array.isArray(curso?.turmas) ? curso.turmas : []).find(item => (item.id || item.turmaId) === turmaId);
  document.getElementById('postponeInicio').value = turma?.dataInicio || '';
  document.getElementById('postponeTermino').value = turma?.dataTermino || turma?.dataFim || '';
}

async function adicionarNovaTurmaAoCurso(courseId, turmaId, dataInicio, dataTermino, turno) {
  turmaId = String(turmaId || '').trim();
  const courseRef = db.collection('cursos').doc(courseId);
  const turmaNova = {
    id: turmaId,
    dataInicio,
    dataTermino,
    turno,
    status: 'planejada'
  };

  if (!turmaId || turmaId.length > 80 || !dataInicio || !dataTermino || dataTermino < dataInicio
    || !['Diurno', 'Noturno'].includes(turno)) {
    throw new Error('Informe um ID, datas válidas e o turno da turma.');
  }

  return db.runTransaction(async transaction => {
    const courseSnapshot = await transaction.get(courseRef);
    if (!courseSnapshot.exists) throw new Error('Curso não encontrado.');
    const course = { id: courseSnapshot.id, ...courseSnapshot.data() };
    if (course.status === 'finalizado') throw new Error('Um curso finalizado não pode receber uma nova turma.');

    const turmas = Array.isArray(course.turmas) ? course.turmas : [];
    const turmaIdNormalizado = turmaId.trim().toLocaleLowerCase('pt-BR');
    const idJaUtilizado = turmas.some(turma =>
      String(turma.id || turma.turmaId || '').trim().toLocaleLowerCase('pt-BR') === turmaIdNormalizado
    );
    if (idJaUtilizado) throw new Error('Já existe uma turma com esse ID neste curso.');

    const turmasAtualizadas = [...turmas, turmaNova];
    const updates = {
      turmas: turmasAtualizadas,
      ...(course.status === 'em_vigor' ? {} : {
        status: 'em_vigor',
        dataInicio,
        dataTermino,
        turno
      })
    };
    transaction.update(courseRef, updates);
    return { ...course, ...updates };
  });
}

async function salvarEdicaoTurma(courseId, turmaId, dataInicio, dataTermino, turno) {
  if (!dataInicio || !dataTermino || dataTermino < dataInicio
    || !['Diurno', 'Noturno'].includes(turno)) {
    throw new Error('Informe um turno e datas válidas para a turma.');
  }

  const courseRef = db.collection('cursos').doc(courseId);
  return db.runTransaction(async transaction => {
    const courseSnapshot = await transaction.get(courseRef);
    if (!courseSnapshot.exists) throw new Error('Curso não encontrado.');

    const course = { id: courseSnapshot.id, ...courseSnapshot.data() };
    const turmas = Array.isArray(course.turmas) ? course.turmas : [];
    const turmaAtual = turmas.find(item => (item.id || item.turmaId) === turmaId);
    if (!turmaAtual || ['cancelada', 'finalizada'].includes(turmaAtual.status)) {
      throw new Error('Turma não encontrada ou não está disponível para edição.');
    }
    const inicioAtual = turmaAtual.dataInicio || course.dataInicio || '';
    const terminoAtual = turmaAtual.dataTermino || turmaAtual.dataFim || course.dataTermino || course.dataFim || '';
    const turnoAtual = turmaAtual.turno || course.turno || '';
    const datasAlteradas = dataInicio !== inicioAtual || dataTermino !== terminoAtual;
    const disponibilidadeAlterada = datasAlteradas || turno !== turnoAtual;
    if (!disponibilidadeAlterada) {
      throw new Error('Nenhuma alteração foi feita na turma.');
    }

    const cursoLevelMatches = course.dataInicio === inicioAtual
      && course.dataTermino === terminoAtual
      && course.turno === turnoAtual;
    const turmasAtualizadas = turmas.map(item => (item.id || item.turmaId) === turmaId
      ? { ...item, dataInicio, dataTermino, turno }
      : item);
    const updates = {
      turmas: turmasAtualizadas,
      ...(cursoLevelMatches ? { dataInicio, dataTermino, turno } : {})
    };
    transaction.update(courseRef, updates);

    return { datasAlteradas, disponibilidadeAlterada };
  });
}

async function excluirTurmaDoCurso(courseId, turmaId) {
  const courseRef = db.collection('cursos').doc(courseId);
  const studentsQuery = db.collection('usuarios')
      .where('cursoId', '==', courseId)
      .where('turmaId', '==', turmaId);

  return db.runTransaction(async transaction => {
    const courseSnapshot = await transaction.get(courseRef);
    const studentsSnapshot = await transaction.get(studentsQuery);
    if (!courseSnapshot.exists) throw new Error('Curso não encontrado.');

    const course = { id: courseSnapshot.id, ...courseSnapshot.data() };
    const turmas = Array.isArray(course.turmas) ? course.turmas : [];
    if (!turmas.some(item => (item.id || item.turmaId) === turmaId)) {
      throw new Error('Turma não encontrada.');
    }

    const alunosVinculados = studentsSnapshot.docs.filter(doc =>
      ['aluno', 'Aluno'].includes(doc.data()?.atribuicao)
    );
    if (alunosVinculados.length) {
      throw new Error(`Não é possível excluir: ${alunosVinculados.length} aluno(s) estão vinculados a esta turma.`);
    }

    const turmasAtualizadas = turmas.filter(item => (item.id || item.turmaId) !== turmaId);
    const aindaHaTurmasAtivas = turmasAtualizadas.some(item =>
      !['cancelada', 'finalizada'].includes(item.status)
    );
    transaction.update(courseRef, {
      turmas: turmasAtualizadas,
      ...(!aindaHaTurmasAtivas ? {
        status: 'em_espera',
        dataInicio: '',
        dataTermino: '',
        turno: ''
      } : {})
    });

    return { curso: course, aindaHaTurmasAtivas };
  });
}

async function retirarCursoDeVigor(courseId) {
  const courseRef = db.collection('cursos').doc(courseId);
  const courseSnapshot = await courseRef.get();
  if (!courseSnapshot.exists) throw new Error('Curso não encontrado.');

  const course = { id: courseSnapshot.id, ...courseSnapshot.data() };
  if (course.status !== 'em_vigor') throw new Error('Este curso não está em vigor.');

  await limparDisponibilidadesDoCurso(courseId);

  const turmasAtualizadas = (Array.isArray(course.turmas) ? course.turmas : []).map(turma => ({
    ...turma,
    dataInicio: '',
    dataTermino: '',
    turno: '',
    status: 'cancelada'
  }));

  await courseRef.update({
    status: 'em_espera',
    dataInicio: '',
    dataTermino: '',
    turno: '',
    turmas: turmasAtualizadas
  });

  if (window.registrarLogAudit) registrarLogAudit(`Retirou o Curso da vigência: ${course.nome || courseId}`, 'adm', { cursoId: courseId });
  showToast('Curso retirado da vigência. As disponibilidades dos professores foram apagadas.', 'success');
  fetchCursos();
  fetchLogs();
}

function normalizarDisciplinasProfessorParaIds(perfil) {
  const valores = [
    ...(Array.isArray(perfil?.disciplinasIds) ? perfil.disciplinasIds : []),
    ...(Array.isArray(perfil?.disciplinas) ? perfil.disciplinas : [])
  ];

  return [...new Set(valores
    .map(value => {
      if (value == null) return '';
      if (typeof value === 'object') {
        if (value.id) return String(value.id);
        const nome = value.nome || value.disciplinaNome || value.disciplina || value.name;
        return nome ? window.academicWorkflow.disciplineId(String(nome)) : '';
      }
      const texto = String(value).trim();
      if (!texto) return '';
      if (texto.includes('::')) {
        const partes = texto.split('::');
        const nome = partes[partes.length - 1];
        return nome ? window.academicWorkflow.disciplineId(String(nome)) : '';
      }
      return window.academicWorkflow.disciplineId(texto);
    })
    .filter(Boolean))];
}

function popularFiltrosDisciplinas() {
  const selectCurso = document.getElementById('disciplineFilterCourse');
  const selectProfessor = document.getElementById('disciplineFilterProfessor');
  if (!selectCurso || !selectProfessor) return;

  const cursos = [...new Set(disciplinasCadastradasCache.flatMap(item => item.cursos))].sort((a, b) => a.localeCompare(b));
  const professores = [...new Set(disciplinasCadastradasCache.flatMap(item => item.professores.filter(nome => nome !== 'Sem professor vinculado')))].sort((a, b) => a.localeCompare(b));

  const cursoAtual = selectCurso.value;
  const professorAtual = selectProfessor.value;

  selectCurso.innerHTML = '<option value="todos">Todos os cursos</option>' + cursos.map(curso => `<option value="${escapeHtml(curso)}">${escapeHtml(curso)}</option>`).join('');
  selectProfessor.innerHTML = '<option value="todos">Todos os professores</option>' + professores.map(professor => `<option value="${escapeHtml(professor)}">${escapeHtml(professor)}</option>`).join('');

  selectCurso.value = cursos.includes(cursoAtual) ? cursoAtual : 'todos';
  selectProfessor.value = professores.includes(professorAtual) ? professorAtual : 'todos';
}

function getFiltrosDisciplinas() {
  const selectCurso = document.getElementById('disciplineFilterCourse');
  const selectProfessor = document.getElementById('disciplineFilterProfessor');
  return {
    curso: selectCurso ? selectCurso.value : 'todos',
    professor: selectProfessor ? selectProfessor.value : 'todos'
  };
}

async function renderizarDisciplinasCadastradas() {
  const lista = document.getElementById('dadosdisciplinas');
  if (!lista) return;

  try {
    const [disciplinasSnapshot, cursosSnapshot] = await Promise.all([
      db.collection('disciplinas').get(),
      db.collection('cursos').get()
    ]);

    const cursos = cursosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const nomesCursos = new Map(cursos.map(curso => [curso.id, curso.nome || curso.id]));
    const professoresPorDisciplina = new Map();

    usuariosProfessores.forEach(professor => {
      const nomeProfessor = professor.nome || 'Professor sem nome';
      const ids = normalizarDisciplinasProfessorParaIds(professor);
      ids.forEach(id => {
        const conjunto = professoresPorDisciplina.get(id) || new Set();
        conjunto.add(nomeProfessor);
        professoresPorDisciplina.set(id, conjunto);
      });
    });

    disciplinasCadastradasCache = disciplinasSnapshot.docs
      .map(doc => {
        const data = doc.data() || {};
        const nome = data.nome || doc.id;
        const courseIds = Array.isArray(data.cursoIds) ? data.cursoIds : [];
        const professores = [...(professoresPorDisciplina.get(doc.id) || [])].sort((a, b) => a.localeCompare(b));
        return {
          id: doc.id,
          nome,
          professores: professores.length ? professores : ['Sem professor vinculado'],
          courseIds,
          cursos: courseIds.map(id => nomesCursos.get(id) || id).filter(Boolean)
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    popularFiltrosDisciplinas();

    const filtros = getFiltrosDisciplinas();
    const disciplinas = disciplinasCadastradasCache.filter(item => {
      const cursoOk = filtros.curso === 'todos' || item.cursos.includes(filtros.curso);
      const professorOk = filtros.professor === 'todos' || item.professores.includes(filtros.professor);
      return cursoOk && professorOk;
    });

    lista.innerHTML = '';

    if (!disciplinas.length) {
      const vazio = document.createElement('li');
      vazio.classList.add('item');
      vazio.textContent = 'Nenhuma disciplina encontrada para os filtros selecionados.';
      lista.appendChild(vazio);
      aplicarBuscaAdm();
      return;
    }

    disciplinas.forEach(disciplina => {
      const li = document.createElement('li');
      li.classList.add('item');
      li.setAttribute('data-search-record', '');

      const nome = document.createElement('p');
      nome.innerHTML = `<strong>Disciplina:</strong> ${disciplina.nome}`;
      li.appendChild(nome);

      const professores = document.createElement('p');
      professores.textContent = `Professor(es): ${disciplina.professores.join(', ')}`;
      li.appendChild(professores);

      const cursos = document.createElement('p');
      cursos.textContent = `Cursos: ${disciplina.cursos.length ? disciplina.cursos.join(', ') : 'Nenhum curso vinculado'}`;
      li.appendChild(cursos);

      lista.appendChild(li);
    });

    aplicarBuscaAdm();
  } catch (error) {
    console.error('Erro ao carregar disciplinas cadastradas:', error);
    lista.innerHTML = '<li class="item">Não foi possível carregar as disciplinas.</li>';
  }
}

function popularFiltrosAlunosPorCursoProfessor() {
  if (!studentFilterCourse || !studentFilterProfessor) return;

  const cursoAtual = studentFilterCourse.value;
  const professorAtual = studentFilterProfessor.value;
  const cursosOrdenados = [...cursosList].sort((a, b) =>
    String(a.nome || a.id).localeCompare(String(b.nome || b.id), 'pt-BR')
  );
  const professoresOrdenados = [...usuariosProfessores].sort((a, b) =>
    String(a.nome || a.nomeCompleto || a.email || a.id)
      .localeCompare(String(b.nome || b.nomeCompleto || b.email || b.id), 'pt-BR')
  );

  studentFilterCourse.innerHTML = '<option value="">Selecione um curso</option>' +
    cursosOrdenados.map(curso =>
      `<option value="${escapeHtml(curso.id)}">${escapeHtml(curso.nome || curso.id)}</option>`
    ).join('');
  studentFilterProfessor.innerHTML = '<option value="">Selecione um professor</option>' +
    professoresOrdenados.map(professor =>
      `<option value="${escapeHtml(professor.id)}">${escapeHtml(professor.nome || professor.nomeCompleto || professor.email || professor.id)}</option>`
    ).join('');

  if (cursosOrdenados.some(curso => curso.id === cursoAtual)) studentFilterCourse.value = cursoAtual;
  if (professoresOrdenados.some(professor => professor.id === professorAtual)) {
    studentFilterProfessor.value = professorAtual;
  }
}

function renderizarAlunosPorCursoProfessor() {
  const lista = document.getElementById('studentsByCourseProfessor');
  if (!lista) return;
  lista.replaceChildren();

  const cursoId = studentFilterCourse?.value || '';
  const professorId = studentFilterProfessor?.value || '';
  if (!cursoId || !professorId) {
    const item = document.createElement('li');
    item.className = 'item';
    item.textContent = 'Selecione um curso e um professor para listar os alunos.';
    lista.appendChild(item);
    aplicarBuscaAdm();
    return;
  }

  const curso = cursosList.find(item => item.id === cursoId);
  const professor = usuariosProfessores.find(item => item.id === professorId);
  if (!curso || !professor) {
    const item = document.createElement('li');
    item.className = 'item';
    item.textContent = 'Não foi possível localizar o curso ou o professor selecionado.';
    lista.appendChild(item);
    aplicarBuscaAdm();
    return;
  }

  const disciplinasProfessor = new Set(normalizarDisciplinasProfessorParaIds(professor));
  const nomesDisciplinas = new Map();
  (Array.isArray(curso.disciplinas) ? curso.disciplinas : []).forEach(disciplina => {
    const id = window.academicWorkflow.subjectId(disciplina);
    const nome = typeof disciplina === 'string' ? disciplina : disciplina?.nome;
    if (id && nome) nomesDisciplinas.set(id, nome);
  });
  disciplinasCadastradasCache
    .filter(disciplina => disciplina.courseIds.includes(cursoId))
    .forEach(disciplina => nomesDisciplinas.set(disciplina.id, disciplina.nome));

  const disciplinasDoProfessor = [...disciplinasProfessor]
    .filter(id => nomesDisciplinas.has(id))
    .map(id => nomesDisciplinas.get(id))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  if (!disciplinasDoProfessor.length) {
    const item = document.createElement('li');
    item.className = 'item';
    item.textContent = 'Este professor não tem disciplinas vinculadas ao curso selecionado.';
    lista.appendChild(item);
    aplicarBuscaAdm();
    return;
  }

  const cursoNome = curso.nome || curso.id;
  const cursoNormalizado = String(cursoNome).trim().toLocaleLowerCase('pt-BR');
  const alunos = usuariosAlunos
    .filter(aluno => {
      if (aluno.cursoId) return aluno.cursoId === cursoId;
      const cursoAluno = String(aluno.cursoSolicitado || aluno.curso || '').trim().toLocaleLowerCase('pt-BR');
      return cursoAluno === cursoNormalizado || cursoAluno === cursoId.toLocaleLowerCase('pt-BR');
    })
    .sort((a, b) => String(a.nome || a.nomeCompleto || '').localeCompare(
      String(b.nome || b.nomeCompleto || ''),
      'pt-BR'
    ));

  if (!alunos.length) {
    const item = document.createElement('li');
    item.className = 'item';
    item.textContent = 'Nenhum aluno cadastrado neste curso.';
    lista.appendChild(item);
    aplicarBuscaAdm();
    return;
  }

  alunos.forEach(aluno => {
    const item = document.createElement('li');
    item.className = 'item';
    item.setAttribute('data-search-record', '');

    const nome = document.createElement('p');
    const nomeDestaque = document.createElement('strong');
    nomeDestaque.textContent = aluno.nome || aluno.nomeCompleto || aluno.email || 'Aluno sem nome';
    nome.appendChild(nomeDestaque);

    const cursoInfo = document.createElement('p');
    cursoInfo.textContent = `Curso: ${cursoNome}${aluno.turmaId ? ` · Turma: ${aluno.turmaId}` : ''}`;

    const disciplinasInfo = document.createElement('p');
    disciplinasInfo.textContent = `Disciplinas com ${professor.nome || professor.nomeCompleto || professor.email || 'o professor'}: ${disciplinasDoProfessor.join(', ')}`;
    item.append(nome, cursoInfo, disciplinasInfo);
    lista.appendChild(item);
  });

  aplicarBuscaAdm();
}

function renderizarLogs(idDaLista, dados) {
  const lista = document.getElementById(idDaLista);
  lista.innerHTML = '';
  
  if (dados.length === 0) {
      lista.innerHTML = '<p style="color:var(--white); text-align:center;">Nenhum log recente.</p>';
      aplicarBuscaAdm();
      return;
  }

  dados.forEach(log => {
      const li = document.createElement('li');
      li.classList.add('item');
      li.setAttribute('data-search-record', '');
      li.style.borderLeftColor = '#888';
      
      const p1 = document.createElement('p');
      p1.innerHTML = `<strong style="color:var(--orange)">Ação:</strong> ${log.acao}`;
      
      const p2 = document.createElement('p');
      p2.innerHTML = `<strong>Por:</strong> ${log.email} (${log.tipoUsuario})`;
      
      const p3 = document.createElement('p');
      // Firebase serverTimestamp() may be null during local optimistic updates
      const dataStr = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate().toLocaleString('pt-BR') : 'agora mesmo';
      p3.textContent = `Em: ${dataStr}`;
      
      li.appendChild(p1);
      li.appendChild(p2);
      li.appendChild(p3);
      lista.appendChild(li);
  });
  aplicarBuscaAdm();
}

function limparCamposNovaTurma() {
  document.getElementById('newClassId').value = '';
  document.getElementById('newClassShift').value = '';
  document.getElementById('newClassStart').value = '';
  document.getElementById('newClassEnd').value = '';
}

// Modal
async function openModal(tipo, usuarioId = '', abrirNovaTurma = false) {
  tipoAtual = tipo;
  const modal = document.getElementById('editModal');
  const select = document.getElementById('selectUsuario');
  aplicarMascarasUsuarioAdm();
  
  // Campos
  const camposUsuario = document.getElementById('camposUsuario');
  const camposCurso = document.getElementById('camposCurso');
  const camposDisciplina = document.getElementById('camposDisciplina');
  camposDisciplina.style.display = 'none';
  
  const nomeInput = document.getElementById('editNome');
  const emailInput = document.getElementById('editEmail');
  const cpfInput = document.getElementById('editCpf');
  const orgaoRgInput = document.getElementById('editOrgaoRg');
  const enderecoInput = document.getElementById('editEndereco');
  const cepInput = document.getElementById('editCep');
  const logradouroInput = document.getElementById('editLogradouro');
  const numeroInput = document.getElementById('editNumero');
  const bairroInput = document.getElementById('editBairro');
  const cidadeInput = document.getElementById('editCidade');
  const ufInput = document.getElementById('editUf');
  const telefoneInput = document.getElementById('editTelefone');
  const telefoneAltInput = document.getElementById('editTelefoneAlt');
  const rgInput = document.getElementById('editRg');
  const nascimentoInput = document.getElementById('editNascimento');
  const atribuicaoSelect = document.getElementById('editAtribuicao');
  const camposCadastroSenha = document.getElementById('camposCadastroSenha');
  
  const nomeCursoInput = document.getElementById('editNomeCurso');
  const precoInput = document.getElementById('editPreco');
  const cargaHorariaInput = document.getElementById('editCargaHoraria');
  const finalizeCourseButton = document.getElementById('finalizeCourseButton');
  const courseVigorActions = document.getElementById('courseVigorActions');
  const newCourseClassFields = document.getElementById('newCourseClassFields');
  
  const deleteBtn = document.getElementById('deleteButton');
  const modalTitle = document.getElementById('modalTitle');

  select.innerHTML = '';

  if (tipo === 'curso' || tipo === 'curso_novo') {
    camposUsuario.style.display = 'none';
    camposCurso.style.display = 'flex';
    camposCurso.style.flexDirection = 'column';
    camposCurso.style.gap = '18px';
    document.getElementById('novoCursoDisciplinasFields').style.display = tipo === 'curso_novo' ? 'flex' : 'none';
    courseVigorActions.style.display = 'none';
    newCourseClassFields.style.display = 'none';
    limparCamposNovaTurma();
    prepararPainelAdiamento(null);

    if (tipo === 'curso_novo') {
        modalTitle.textContent = 'Criar Novo Curso';
        select.style.display = 'none';
        document.querySelector('.requiredq').style.display = 'none'; // Oculta label 'Selecione o registro'
        
        // Ativa ediçao do nome para novos
        nomeCursoInput.disabled = false;
        nomeCursoInput.style.background = '';
        nomeCursoInput.style.cursor = 'text';
        
        usuarioAtual = null;
        nomeCursoInput.value = '';
        precoInput.value = '';
        cargaHorariaInput.value = '';
        deleteBtn.style.display = 'none';
        await carregarDisciplinasParaNovoCurso();
    } else {
        modalTitle.textContent = 'Editar Curso';
        select.style.display = 'block';
        document.querySelector('.requiredq').style.display = 'block';
        
        // Bloqueia edição do nome
        nomeCursoInput.disabled = true;
        nomeCursoInput.style.background = '#333';
        nomeCursoInput.style.cursor = 'not-allowed';
    
    cursosList.forEach(item => {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.nome;
      select.appendChild(option);
    });

    if (cursosList.length > 0) {
      usuarioAtual = cursosList.find(item => item.id === usuarioId) || cursosList[0];
      select.value = usuarioAtual.id;
      nomeCursoInput.value = usuarioAtual.nome || '';
      precoInput.value = usuarioAtual.preco || '';
      cargaHorariaInput.value = usuarioAtual.cargaHoraria || usuarioAtual.cargaHr || '';
      courseVigorActions.style.display = usuarioAtual.status === 'em_vigor' ? 'grid' : 'none';
      prepararPainelAdiamento(usuarioAtual);
      deleteBtn.style.display = 'inline-block';
    }
    if (abrirNovaTurma && usuarioAtual?.status !== 'finalizado') {
      newCourseClassFields.style.display = 'grid';
      document.getElementById('newClassId').focus();
    }
  } // fim do bloco de edicao de curso
  } else if (tipo === 'funcionario_novo' || tipo === 'professor_novo') {
    const atribuicao = tipo === 'professor_novo' ? 'professor' : 'funcionario';
    document.getElementById('editForm').reset();
    camposUsuario.style.display = 'flex';
    camposUsuario.style.flexDirection = 'column';
    camposUsuario.style.gap = '18px';
    camposCurso.style.display = 'none';
    camposDisciplina.style.display = 'none';
    select.style.display = 'none';
    select.previousElementSibling.style.display = 'none';
    camposCadastroSenha.style.display = 'flex';
    camposCadastroSenha.style.flexDirection = 'column';
    camposCadastroSenha.style.gap = '12px';
    modalTitle.textContent = atribuicao === 'professor' ? 'Cadastrar Professor' : 'Cadastrar Funcionário';
    usuarioAtual = null;
    atribuicaoSelect.value = atribuicao;
    atribuicaoSelect.disabled = true;
    await atualizarCampoDisciplinasProfessor(atribuicao, []);
    atualizarCamposMatriculaAluno(atribuicao);
    deleteBtn.style.display = 'none';
  } else if (tipo === 'disciplina_nova') {
    camposUsuario.style.display = 'none';
    camposCurso.style.display = 'none';
    camposDisciplina.style.display = 'flex';
    camposDisciplina.style.flexDirection = 'column';
    camposDisciplina.style.gap = '12px';
    modalTitle.textContent = 'Criar disciplina';
    select.style.display = 'none';
    select.previousElementSibling.style.display = 'none';
    document.getElementById('editNomeDisciplina').value = '';
    document.getElementById('novaDisciplinaError').textContent = '';
    deleteBtn.style.display = 'none';
    if (!cursosList.length) {
      const snapshot = await db.collection('cursos').get();
      cursosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const courseSelect = document.getElementById('disciplinaCursos');
    courseSelect.innerHTML = '';
    cursosList.forEach(course => {
      const option = document.createElement('option');
      option.value = course.id;
      option.textContent = course.nome || course.id;
      courseSelect.appendChild(option);
    });
  } else {
    camposDisciplina.style.display = 'none';
    camposCadastroSenha.style.display = 'none';
    atribuicaoSelect.disabled = false;
    select.previousElementSibling.style.display = 'block';
    // Bloco de Usuarios (Funcionario e Aluno)
    camposUsuario.style.display = 'flex';
    select.style.display = 'block';
    document.querySelector('.requiredq').style.display = 'block';
    camposUsuario.style.flexDirection = 'column';
    camposUsuario.style.gap = '18px';
    camposCurso.style.display = 'none';
    
    let lista = tipo === 'funcionario' ? usuariosFuncionarios : (tipo === 'professor' ? usuariosProfessores : usuariosAlunos);
    modalTitle.textContent = tipo === 'funcionario' ? 'Editar Funcionário' : (tipo === 'professor' ? 'Editar Professor' : 'Editar Aluno');

    lista.forEach(user => {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = user.nome + ' (' + user.cpf + ')';
      select.appendChild(option);
    });

    if (lista.length > 0) {
      usuarioAtual = lista.find(user => user.id === usuarioId) || lista[0];
      select.value = usuarioAtual.id;
      nomeInput.value = usuarioAtual.nome || '';
      emailInput.value = usuarioAtual.email || '';
      cpfInput.value = usuarioAtual.cpf || '';
      if (orgaoRgInput) orgaoRgInput.value = usuarioAtual.orgaoRg || '';
      enderecoInput.value = usuarioAtual.endereco || '';
      cepInput.value = usuarioAtual.cep || '';
      logradouroInput.value = usuarioAtual.logradouro || '';
      numeroInput.value = usuarioAtual.numero || '';
      bairroInput.value = usuarioAtual.bairro || '';
      cidadeInput.value = usuarioAtual.cidade || '';
      ufInput.value = usuarioAtual.uf || '';
      telefoneInput.value = usuarioAtual.telefone || '';
      telefoneAltInput.value = usuarioAtual.telefoneAlt || '';
      if (rgInput) rgInput.value = usuarioAtual.rg || '';
      nascimentoInput.value = usuarioAtual.nascimento || '';
      atribuicaoSelect.value = usuarioAtual.atribuicao || '';
      atualizarCampoDisciplinasProfessor(usuarioAtual.atribuicao, usuarioAtual.disciplinasIds || []);
      atualizarCamposMatriculaAluno(usuarioAtual.atribuicao, usuarioAtual);
      deleteBtn.style.display = 'inline-block';
    } else {
      usuarioAtual = null;
      nomeInput.value = '';
      emailInput.value = '';
      cpfInput.value = '';
      if (orgaoRgInput) orgaoRgInput.value = '';
      enderecoInput.value = '';
      cepInput.value = '';
      logradouroInput.value = '';
      numeroInput.value = '';
      bairroInput.value = '';
      cidadeInput.value = '';
      ufInput.value = '';
      telefoneInput.value = '';
      telefoneAltInput.value = '';
      if (rgInput) rgInput.value = '';
      nascimentoInput.value = '';
      atribuicaoSelect.value = '';
      atualizarCampoDisciplinasProfessor('');
      atualizarCamposMatriculaAluno('');
      deleteBtn.style.display = 'none';
    }
  }

  modal.style.display = 'flex';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

document.getElementById('cancelClassEditButton').addEventListener('click', fecharEdicaoTurma);

document.getElementById('editClassForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (!turmaEmEdicao) return;

  const button = document.getElementById('saveClassChangesButton');
  const { cursoId, turmaId, cursoNome } = turmaEmEdicao;
  const dataInicio = document.getElementById('editClassStart').value;
  const dataTermino = document.getElementById('editClassEnd').value;
  const turno = document.getElementById('editClassShift').value;
  let turmaSalva = false;
  button.disabled = true;

  try {
    const resultado = await salvarEdicaoTurma(cursoId, turmaId, dataInicio, dataTermino, turno);
    turmaSalva = true;

    if (resultado.datasAlteradas) {
      const alunosSnapshot = await db.collection('usuarios')
        .where('cursoId', '==', cursoId)
        .where('turmaId', '==', turmaId)
        .get();
      await Promise.all(alunosSnapshot.docs
        .filter(doc => ['aluno', 'Aluno'].includes(doc.data()?.atribuicao))
        .map(doc => doc.ref.update({ dataInicio, dataTermino })));
    }

    let notificationsCreated = 0;
    if (resultado.disponibilidadeAlterada) {
      await limparDisponibilidadesDoCurso(cursoId, turmaId, 'Dados da turma alterados.');
      const cursoSnapshot = await db.collection('cursos').doc(cursoId).get();
      if (!cursoSnapshot.exists) throw new Error('Curso não encontrado após salvar a turma.');
      notificationsCreated = await window.academicWorkflow.notifyCourseProfessors(
        db,
        cursoId,
        { id: cursoSnapshot.id, ...cursoSnapshot.data() }
      );
      await window.academicWorkflow.syncCourseStudentTeachers(db, cursoId);
    }

    if (window.registrarLogAudit) registrarLogAudit(`Editou a turma ${turmaId} do Curso: ${cursoNome}`, 'adm', {
      cursoId, turmaId, turno, dataInicio, dataTermino
    });
    showToast(`Turma ${turmaId} atualizada. ${notificationsCreated} nova(s) solicitação(ões) enviada(s) aos professores.`, 'success');
    fecharEdicaoTurma();
    fetchCursos();
    fetchLogs();
  } catch (error) {
    showToast(turmaSalva
      ? 'A turma foi salva, mas não foi possível concluir a atualização dos dados acadêmicos: ' + error.message
      : 'Erro ao editar turma: ' + error.message, 'error');
    if (turmaSalva) {
      fecharEdicaoTurma();
      fetchCursos();
    }
  } finally {
    button.disabled = false;
  }
});

async function excluirTurmaDaLista(curso, turmaId) {
  if (!confirm(`Excluir a turma ${turmaId} do curso ${curso.nome || curso.id}? Alunos vinculados impedem a exclusão.`)) return;

  let turmaExcluida = false;
  try {
    await excluirTurmaDoCurso(curso.id, turmaId);
    turmaExcluida = true;
    await limparDisponibilidadesDoCurso(curso.id, turmaId, 'Turma excluída.');
    const cursoSnapshot = await db.collection('cursos').doc(curso.id).get();
    if (!cursoSnapshot.exists) throw new Error('Curso não encontrado após excluir a turma.');
    await window.academicWorkflow.notifyCourseProfessors(
      db,
      curso.id,
      { id: cursoSnapshot.id, ...cursoSnapshot.data() }
    );
    await window.academicWorkflow.syncCourseStudentTeachers(db, curso.id);

    if (window.registrarLogAudit) registrarLogAudit(`Excluiu a turma ${turmaId} do Curso: ${curso.nome || curso.id}`, 'adm', {
      cursoId: curso.id, turmaId
    });
    showToast(`Turma ${turmaId} excluída.`, 'success');
    fetchCursos();
    fetchLogs();
  } catch (error) {
    showToast(turmaExcluida
      ? 'A turma foi excluída, mas não foi possível concluir a limpeza dos dados acadêmicos: ' + error.message
      : 'Erro ao excluir turma: ' + error.message, 'error');
    if (turmaExcluida) fetchCursos();
  }
}

document.getElementById('finalizeCourseButton').addEventListener('click', async () => {
  if (tipoAtual !== 'curso' || !usuarioAtual || !confirm(`Finalizar o curso ${usuarioAtual.nome}?`)) return;

  try {
    const courseRef = db.collection('cursos').doc(usuarioAtual.id);
    const courseSnapshot = await courseRef.get();
    if (!courseSnapshot.exists) throw new Error('Curso não encontrado.');
    const course = courseSnapshot.data() || {};
    const turmas = (Array.isArray(course.turmas) ? course.turmas : []).map(turma => ({ ...turma, status: 'finalizada' }));
    await limparDisponibilidadesDoCurso(usuarioAtual.id);
    await courseRef.update({ status: 'finalizado', turmas });
    let erroNotificacoes = null;
    try {
      await window.academicWorkflow.notifyCourseProfessors(db, usuarioAtual.id, { ...course, id: courseSnapshot.id, status: 'finalizado', turmas });
    } catch (error) {
      erroNotificacoes = error;
      console.error('Curso finalizado, mas não foi possível cancelar solicitações pendentes:', error);
    }
    if (window.registrarLogAudit) registrarLogAudit(`Finalizou o Curso: ${usuarioAtual.nome}`, 'adm', { cursoId: usuarioAtual.id });
    showToast(erroNotificacoes ? 'Curso finalizado, mas houve um erro ao cancelar solicitações pendentes.' : 'Curso finalizado!', erroNotificacoes ? 'error' : 'success');
    closeModal();
    fetchCursos();
    fetchLogs();
  } catch (error) {
    showToast('Erro ao finalizar curso: ' + error.message, 'error');
  }
});

document.getElementById('postponeTurma').addEventListener('change', () => preencherDatasAdiamento(usuarioAtual));

document.getElementById('postponeCourseButton').addEventListener('click', async event => {
  if (tipoAtual !== 'curso' || !usuarioAtual) return;
  const button = event.currentTarget;
  const turmaId = document.getElementById('postponeTurma').value;
  const novoInicio = document.getElementById('postponeInicio').value;
  const novoTermino = document.getElementById('postponeTermino').value;
  if (!confirm(`Adiar a turma ${turmaId} para ${novoInicio} até ${novoTermino}? Se o início mudar, os professores precisarão informar a disponibilidade novamente.`)) return;

  button.disabled = true;
  try {
    await adiarTurmaDoCurso(usuarioAtual.id, turmaId, novoInicio, novoTermino);
    closeModal();
  } catch (error) {
    showToast('Erro ao adiar turma: ' + error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

document.getElementById('startNewCourseClassButton').addEventListener('click', () => {
  const fields = document.getElementById('newCourseClassFields');
  limparCamposNovaTurma();
  fields.style.display = 'grid';
  document.getElementById('newClassId').focus();
});

document.getElementById('cancelNewCourseClassButton').addEventListener('click', () => {
  document.getElementById('newCourseClassFields').style.display = 'none';
  limparCamposNovaTurma();
});

document.getElementById('confirmNewCourseClassButton').addEventListener('click', async event => {
  if (tipoAtual !== 'curso' || !usuarioAtual) return;

  const button = event.currentTarget;
  const turmaId = document.getElementById('newClassId').value.trim();
  const turno = document.getElementById('newClassShift').value;
  const dataInicio = document.getElementById('newClassStart').value;
  const dataTermino = document.getElementById('newClassEnd').value;
  if (!turmaId || !dataInicio || !dataTermino || dataTermino < dataInicio || !turno) {
    showToast('Informe o ID, datas válidas e o turno da nova turma.', 'error');
    return;
  }
  if (!confirm(`Iniciar a turma ${turmaId} do curso ${usuarioAtual.nome}, de ${dataInicio} até ${dataTermino}?`)) return;

  button.disabled = true;
  try {
    const cursoAtualizado = await adicionarNovaTurmaAoCurso(
      usuarioAtual.id,
      turmaId,
      dataInicio,
      dataTermino,
      turno
    );

    try {
      const notificationsCreated = await window.academicWorkflow.notifyCourseProfessors(
        db,
        usuarioAtual.id,
        cursoAtualizado
      );
      await window.academicWorkflow.syncCourseStudentTeachers(db, usuarioAtual.id);
      if (window.registrarLogAudit) registrarLogAudit(`Iniciou nova turma ${turmaId} do Curso: ${usuarioAtual.nome}`, 'adm', {
        cursoId: usuarioAtual.id,
        turmaId,
        turno,
        dataInicio,
        dataTermino
      });
      showToast(`Turma criada. ${notificationsCreated} solicitação(ões) de disponibilidade enviada(s) aos professores.`, 'success');
    } catch (error) {
      console.error('Turma criada, mas houve erro ao atualizar o fluxo acadêmico:', error);
      showToast(`A turma foi criada, mas não foi possível concluir as notificações ou atualizar as matrículas: ${error.message}`, 'error');
    }

    closeModal();
    fetchCursos();
    fetchLogs();
  } catch (error) {
    showToast('Erro ao criar turma: ' + error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

// Atualiza campos ao trocar usuário/curso selecionado
document.getElementById('selectUsuario').addEventListener('change', function() {
  if (tipoAtual === 'curso') {
    usuarioAtual = cursosList.find(c => c.id === this.value);
    document.getElementById('editNomeCurso').value = usuarioAtual?.nome || '';
    document.getElementById('editPreco').value = usuarioAtual?.preco || '';
    document.getElementById('editCargaHoraria').value = usuarioAtual?.cargaHoraria || usuarioAtual?.cargaHr || '';
    document.getElementById('courseVigorActions').style.display = usuarioAtual?.status === 'em_vigor' ? 'grid' : 'none';
    document.getElementById('newCourseClassFields').style.display = 'none';
    prepararPainelAdiamento(usuarioAtual);
  } else {
    let lista = tipoAtual === 'funcionario' ? usuariosFuncionarios : (tipoAtual === 'professor' ? usuariosProfessores : usuariosAlunos);
    usuarioAtual = lista.find(u => u.id === this.value);
    document.getElementById('editNome').value = usuarioAtual?.nome || '';
    document.getElementById('editEmail').value = usuarioAtual?.email || '';
    document.getElementById('editCpf').value = usuarioAtual?.cpf || '';
    const orgaoRgInput = document.getElementById('editOrgaoRg');
    if (orgaoRgInput) orgaoRgInput.value = usuarioAtual?.orgaoRg || '';
    document.getElementById('editEndereco').value = usuarioAtual?.endereco || '';
    document.getElementById('editCep').value = usuarioAtual?.cep || '';
    document.getElementById('editLogradouro').value = usuarioAtual?.logradouro || '';
    document.getElementById('editNumero').value = usuarioAtual?.numero || '';
    document.getElementById('editBairro').value = usuarioAtual?.bairro || '';
    document.getElementById('editCidade').value = usuarioAtual?.cidade || '';
    document.getElementById('editUf').value = usuarioAtual?.uf || '';
    document.getElementById('editTelefone').value = usuarioAtual?.telefone || '';
    document.getElementById('editTelefoneAlt').value = usuarioAtual?.telefoneAlt || '';
    const rgInput = document.getElementById('editRg');
    if (rgInput) rgInput.value = usuarioAtual?.rg || '';
    document.getElementById('editNascimento').value = usuarioAtual?.nascimento || '';
    document.getElementById('editAtribuicao').value = usuarioAtual?.atribuicao || '';
    atualizarCampoDisciplinasProfessor(usuarioAtual?.atribuicao, usuarioAtual?.disciplinasIds || []);
    atualizarCamposMatriculaAluno(usuarioAtual?.atribuicao, usuarioAtual);
  }
});

document.getElementById('editAtribuicao').addEventListener('change', function() {
  atualizarCampoDisciplinasProfessor(this.value, this.value === 'professor' ? (usuarioAtual?.disciplinasIds || []) : []);
  atualizarCamposMatriculaAluno(this.value, usuarioAtual);
});

function atualizarCamposMatriculaAluno(atribuicao, aluno = {}) {
  const campos = document.getElementById('camposMatriculaAluno');
  if (!campos) return;
  campos.style.display = atribuicao === 'aluno' ? 'flex' : 'none';
  if (atribuicao !== 'aluno') return;
  document.getElementById('editCursoAluno').value = aluno.cursoSolicitado || aluno.curso || '';
  document.getElementById('editTurmaAluno').value = aluno.turmaId || '';
  document.getElementById('editInicioAluno').value = aluno.dataInicio || '';
  document.getElementById('editTerminoAluno').value = aluno.dataTermino || '';
}

async function atualizarCampoDisciplinasProfessor(atribuicao, selecionadas = []) {
  const campos = document.getElementById('camposProfessorDisciplinas');
  if (!campos) return;
  campos.style.display = atribuicao === 'professor' ? 'flex' : 'none';
  if (atribuicao !== 'professor') return;

  const container = document.getElementById('editProfessorDisciplinas');
  container.innerHTML = '<span>Carregando disciplinas...</span>';
  try {
    if (!cursosList.length) {
      const coursesSnapshot = await db.collection('cursos').get();
      cursosList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    await window.academicWorkflow.ensureCourseDisciplineRecords(db, cursosList);
    const snapshot = await db.collection('disciplinas').get();
    const opcoes = snapshot.docs.map(doc => {
      const discipline = doc.data() || {};
      const courseNames = (discipline.cursoIds || [])
        .map(courseId => cursosList.find(course => course.id === courseId)?.nome || courseId);
      return { chave: doc.id, nome: discipline.nome || doc.id, cursoIds: discipline.cursoIds || [], cursoNome: courseNames.join(', ') };
    }).filter(item => item.cursoNome);
    disciplinasProfessorDisponiveis = opcoes;
    const selecionadasChaves = new Set(selecionadas);
    container.innerHTML = opcoes.length ? opcoes.map(item => `<label class="professor-discipline-option"><input type="checkbox" value="${escapeHtml(item.chave)}" ${selecionadasChaves.has(item.chave) ? 'checked' : ''}><span><strong>${escapeHtml(item.nome)}</strong><small>${escapeHtml(item.cursoNome)}</small></span></label>`).join('') : '<span>Nenhuma disciplina cadastrada nos cursos.</span>';
  } catch (error) {
    console.error('Erro ao carregar disciplinas do professor:', error);
    container.innerHTML = '<span>Não foi possível carregar as disciplinas.</span>';
  }
}

function obterDisciplinasProfessorSelecionadas() {
  return Array.from(document.querySelectorAll('#editProfessorDisciplinas input:checked'))
    .map(input => input.value);
}

async function carregarDisciplinasParaNovoCurso() {
  const container = document.getElementById('novoCursoDisciplinasOptions');
  const errorElement = document.getElementById('novoCursoDisciplinasError');
  container.innerHTML = '<span>Carregando disciplinas...</span>';
  errorElement.textContent = '';

  try {
    const coursesSnapshot = await db.collection('cursos').get();
    cursosList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    await window.academicWorkflow.ensureCourseDisciplineRecords(db, cursosList);
    const disciplinesSnapshot = await db.collection('disciplinas').get();
    disciplinasCatalogoNovoCurso = disciplinesSnapshot.docs
      .map(doc => ({ id: doc.id, nome: doc.data()?.nome || doc.id }))
      .sort((left, right) => left.nome.localeCompare(right.nome));

    container.replaceChildren();
    if (!disciplinasCatalogoNovoCurso.length) {
      container.textContent = 'Nenhuma disciplina cadastrada.';
      return;
    }

    disciplinasCatalogoNovoCurso.forEach(discipline => {
      const label = document.createElement('label');
      label.className = 'professor-discipline-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = discipline.id;
      const name = document.createElement('span');
      name.textContent = discipline.nome;
      label.append(checkbox, name);
      container.appendChild(label);
    });
  } catch (error) {
    console.error('Erro ao carregar disciplinas para novo curso:', error);
    disciplinasCatalogoNovoCurso = [];
    container.textContent = 'Não foi possível carregar as disciplinas.';
    errorElement.textContent = error.message || 'Tente novamente.';
  }
}

function obterDisciplinasDoNovoCurso() {
  const selecionadas = new Set(Array.from(document.querySelectorAll('#novoCursoDisciplinasOptions input:checked'))
    .map(input => input.value));
  return disciplinasCatalogoNovoCurso
    .filter(discipline => selecionadas.has(discipline.id))
    .map(({ id, nome }) => ({ id, nome }));
}

async function criarContaDeEquipe(profile, atribuicao, disciplinasIds = []) {
  const appName = 'themis-staff-registration';
  const secondaryApp = firebase.apps.find(app => app.name === appName)
    || firebase.initializeApp(firebase.app().options, appName);
  const secondaryAuth = firebase.auth(secondaryApp);
  const { password, ...profileData } = profile;
  let credential = null;

  try {
    credential = await secondaryAuth.createUserWithEmailAndPassword(profile.email, password);
    await credential.user.updateProfile({ displayName: profile.nome });
    await db.collection('usuarios').doc(credential.user.uid).set({
      ...profileData,
      atribuicao,
      ...(atribuicao === 'professor' ? { disciplinasIds } : {}),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      cadastradoPor: firebase.auth().currentUser.uid
    });
    return credential.user.uid;
  } catch (error) {
    if (credential?.user) await credential.user.delete().catch(() => {});
    throw error;
  } finally {
    await secondaryAuth.signOut().catch(() => {});
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

async function montarVinculoAcademico(cursoInformado, turmaId, dataInicio, dataTermino) {
  const snapshot = await db.collection('cursos').get();
  const valorCurso = String(cursoInformado || '').trim().toLowerCase();
  const curso = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    .find(item => item.id.toLowerCase() === valorCurso || String(item.nome || '').toLowerCase() === valorCurso);
  if (!curso) return null;
  const turmas = Array.isArray(curso.turmas) ? curso.turmas : [];
  const turma = turmas.find(item => (item.id || item.turmaId) === turmaId) || (turmas.length === 1 ? turmas[0] : null);
  if (!turma) return null;
  const cursoNome = curso.nome || curso.id;
  const turmaFinal = turmaId || turma?.id || turma?.turmaId || '';
  if (!turmaFinal) return null;
  const { disciplines, missing } = await window.academicWorkflow.buildStudentDisciplineLinks(firebase.firestore(), { ...curso, id: curso.id }, turmaFinal);
  return {
    cursoId: curso.id,
    cursoSolicitado: cursoNome,
    turmaId: turmaFinal,
    dataInicio: turma.dataInicio || curso.dataInicio || '',
    dataTermino: turma.dataTermino || turma.dataFim || curso.dataTermino || curso.dataFim || '',
    disciplinas: disciplines,
    disciplinasKeys: disciplines.map(item => item.disciplinaKey),
    professoresPorDisciplina: Object.fromEntries(disciplines.map(item => [item.disciplinaKey, item.professorId])),
    disciplinasSemProfessor: missing
  };
}

// Editar usuário ou curso
document.getElementById('editForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  if (tipoAtual === 'funcionario_novo' || tipoAtual === 'professor_novo') {
    const atribuicao = tipoAtual === 'professor_novo' ? 'professor' : 'funcionario';
    const nome = document.getElementById('editNome').value.trim();
    const email = document.getElementById('editEmail').value.trim().toLowerCase();
    const senha = document.getElementById('editSenhaInicial').value;
    const confirmarSenha = document.getElementById('editConfirmarSenhaInicial').value;
    const disciplinasIds = atribuicao === 'professor' ? obterDisciplinasProfessorSelecionadas() : [];

    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Informe um nome e um e-mail válido.', 'error');
      return;
    }
    if (senha.length < 6 || senha !== confirmarSenha) {
      showToast('As senhas devem coincidir e ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (atribuicao === 'professor' && !disciplinasIds.length) {
      document.getElementById('professorDisciplinasError').textContent = 'Selecione pelo menos uma disciplina.';
      return;
    }
    const profile = {
      nome,
      email,
      password: senha,
      cpf: obterValorCampo('editCpf'),
      orgaoRg: obterValorCampo('editOrgaoRg'),
      endereco: obterValorCampo('editEndereco'),
      cep: obterValorCampo('editCep'),
      logradouro: obterValorCampo('editLogradouro'),
      numero: obterValorCampo('editNumero'),
      bairro: obterValorCampo('editBairro'),
      cidade: obterValorCampo('editCidade'),
      uf: obterValorCampo('editUf').toUpperCase(),
      telefone: obterValorCampo('editTelefone'),
      telefoneAlt: obterValorCampo('editTelefoneAlt'),
      rg: obterValorCampo('editRg'),
      nascimento: obterValorCampo('editNascimento')
    };

    try {
      const uid = await criarContaDeEquipe(profile, atribuicao, disciplinasIds);
      let notificationError = null;
      if (atribuicao === 'professor') {
        const courseIds = [...new Set(disciplinasProfessorDisponiveis
          .filter(item => disciplinasIds.includes(item.chave))
          .flatMap(item => item.cursoIds))];
        try {
          await Promise.all(courseIds.map(async courseId => {
            const courseDoc = await db.collection('cursos').doc(courseId).get();
            if (courseDoc.exists) await window.academicWorkflow.notifyCourseProfessors(db, courseId, { id: courseDoc.id, ...courseDoc.data() });
            await window.academicWorkflow.syncCourseStudentTeachers(db, courseId);
          }));
        } catch (error) {
          notificationError = error;
          console.error('Professor cadastrado, mas houve falha ao atualizar os cursos:', error);
        }
      }

      if (window.registrarLogAudit) registrarLogAudit(`Cadastrou ${atribuicao === 'professor' ? 'Professor' : 'Funcionário'}: ${nome} | ${email}`, 'adm', { uid });
      showToast(notificationError
        ? 'Cadastro realizado, mas houve uma falha ao atualizar os cursos vinculados.'
        : `${atribuicao === 'professor' ? 'Professor' : 'Funcionário'} cadastrado com sucesso!`, notificationError ? 'error' : 'success');
      closeModal();
      findUsers();
      fetchLogs();
    } catch (error) {
      console.error(`Erro ao cadastrar ${atribuicao}:`, error);
      showToast(error.message || 'Não foi possível concluir o cadastro.', 'error');
    }
    return;
  }

  if (tipoAtual === 'disciplina_nova') {
    const errorElement = document.getElementById('novaDisciplinaError');
    const nome = document.getElementById('editNomeDisciplina').value.trim();
    const courseIds = Array.from(document.getElementById('disciplinaCursos').selectedOptions).map(option => option.value);
    errorElement.textContent = '';
    if (!nome || nome.length > 120) {
      errorElement.textContent = 'Informe um nome de até 120 caracteres.';
      return;
    }
    if (!courseIds.length) {
      errorElement.textContent = 'Selecione ao menos um curso.';
      return;
    }
    try {
      const discipline = await window.academicWorkflow.linkDisciplineToCourses(db, nome, courseIds);
      await Promise.all(courseIds.map(async courseId => {
        const courseDoc = await db.collection('cursos').doc(courseId).get();
        if (!courseDoc.exists) return;
        const course = { id: courseDoc.id, ...courseDoc.data() };
        await window.academicWorkflow.notifyCourseProfessors(db, courseId, course);
        await window.academicWorkflow.syncCourseStudentTeachers(db, courseId);
      }));
      if (window.registrarLogAudit) registrarLogAudit(`Criou disciplina: ${discipline.nome}`, 'adm', { disciplinaId: discipline.id, cursoIds: discipline.cursoIds });
      showToast(`Disciplina criada e vinculada a ${courseIds.length} curso(s).`, 'success');
      closeModal();
      fetchCursos();
      fetchLogs();
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      errorElement.textContent = error.message || 'Não foi possível criar a disciplina.';
    }
    return;
  }

  if (tipoAtual === 'curso_novo') {
      const nomeCurso = document.getElementById('editNomeCurso').value;
      const preco = document.getElementById('editPreco').value;
      const cargaHoraria = document.getElementById('editCargaHoraria').value;
      const disciplinas = obterDisciplinasDoNovoCurso();
      if (!nomeCurso) {
          alert('Por favor, digite o nome do curso.');
          return;
      }
      
      firebase.firestore()
        .collection('cursos')
        .add({
          nome: nomeCurso,
          disciplinas,
          preco: preco || '',
          cargaHoraria: cargaHoraria || '',
          status: 'em_espera'
        })
        .then(async courseRef => {
          let disciplinasSincronizadas = true;
          if (disciplinas.length) {
            try {
              await window.academicWorkflow.ensureCourseDisciplineRecords(db, [{ id: courseRef.id, disciplinas }]);
            } catch (error) {
              disciplinasSincronizadas = false;
              console.error('Curso criado, mas não foi possível vincular as disciplinas:', error);
            }
          }
          if (window.registrarLogAudit) registrarLogAudit(`Criou Curso: ${nomeCurso}`, 'adm', {preco, cargaHoraria, disciplinas: disciplinas.map(item => item.id)});
          showToast(disciplinasSincronizadas ? 'Curso criado com sucesso!' : 'Curso criado, mas houve erro ao sincronizar as disciplinas.', disciplinasSincronizadas ? 'success' : 'error');
          closeModal();
          fetchCursos();
          fetchLogs();
        })
        .catch(error => {
          showToast("Erro ao criar: " + error.message, "error");
        });
      return; 
  }

  // Se nao for novo curso, requer que tenha um selecionado
  if (!usuarioAtual) return;

  if (tipoAtual === 'curso') {
      const preco = document.getElementById('editPreco').value;
      const cargaHoraria = document.getElementById('editCargaHoraria').value;
      firebase.firestore()
        .collection('cursos')
        .doc(usuarioAtual.id)
        .update({
          preco: preco,
          cargaHoraria
        })
        .then(async () => {
          await window.academicWorkflow.syncCourseStudentTeachers(firebase.firestore(), usuarioAtual.id);
          if (window.registrarLogAudit) registrarLogAudit(`Atualizou Curso: ${usuarioAtual.nome}`, 'adm', {preco, cargaHoraria});
          showToast("Curso atualizado com sucesso!", "success");
          closeModal();
          fetchCursos();
          fetchLogs();
        })
        .catch(error => {
          showToast("Erro ao atualizar: " + error.message, "error");
        });
  } else {
      const novoNome = document.getElementById('editNome').value;
      const novoEmail = document.getElementById('editEmail').value.trim().toLowerCase();
      const novoCpf = obterValorCampo('editCpf');
      const novoOrgaoRg = obterValorCampo('editOrgaoRg');
      const novoEndereco = obterValorCampo('editEndereco');
      const novoCep = obterValorCampo('editCep');
      const novoLogradouro = obterValorCampo('editLogradouro');
      const novoNumero = obterValorCampo('editNumero');
      const novoBairro = obterValorCampo('editBairro');
      const novaCidade = obterValorCampo('editCidade');
      const novaUf = obterValorCampo('editUf').toUpperCase();
      const novoTelefone = obterValorCampo('editTelefone');
      const novoTelefoneAlt = obterValorCampo('editTelefoneAlt');
      const novoRg = obterValorCampo('editRg');
      const novoNascimento = obterValorCampo('editNascimento');
      const novaAtribuicao = document.getElementById('editAtribuicao').value;
      const cursoAluno = document.getElementById('editCursoAluno').value.trim();
      const turmaAluno = document.getElementById('editTurmaAluno').value.trim();
      const inicioAluno = document.getElementById('editInicioAluno').value;
      const terminoAluno = document.getElementById('editTerminoAluno').value;
      let vinculoAcademico = {};
      if (novaAtribuicao === 'aluno') {
        vinculoAcademico = await montarVinculoAcademico(cursoAluno, turmaAluno, inicioAluno, terminoAluno);
        if (!vinculoAcademico) {
          alert('Curso não encontrado. Informe um curso cadastrado.');
          return;
        }
      }
        const disciplinasIds = novaAtribuicao === 'professor' ? obterDisciplinasProfessorSelecionadas() : [];

        if (novaAtribuicao === 'professor' && disciplinasIds.length === 0) {
          document.getElementById('professorDisciplinasError').textContent = 'Selecione pelo menos uma disciplina.';
          return;
        }
        const { disciplinasSemProfessor, ...vinculoAcademicoPersistido } = vinculoAcademico;

      firebase.firestore()
        .collection('usuarios')
        .doc(usuarioAtual.id)
        .update({
          nome: novoNome,
          email: novoEmail,
          cpf: novoCpf,
          orgaoRg: novoOrgaoRg,
          endereco: novoEndereco,
          cep: novoCep,
          logradouro: novoLogradouro,
          numero: novoNumero,
          bairro: novoBairro,
          cidade: novaCidade,
          uf: novaUf,
          telefone: novoTelefone,
          telefoneAlt: novoTelefoneAlt,
          rg: novoRg,
          nascimento: novoNascimento,
          atribuicao: novaAtribuicao,
          cursoSolicitado: novaAtribuicao === 'aluno' ? cursoAluno : firebase.firestore.FieldValue.delete(),
          turmaId: novaAtribuicao === 'aluno' ? turmaAluno : firebase.firestore.FieldValue.delete(),
          dataInicio: novaAtribuicao === 'aluno' ? inicioAluno : firebase.firestore.FieldValue.delete(),
          dataTermino: novaAtribuicao === 'aluno' ? terminoAluno : firebase.firestore.FieldValue.delete(),
          ...(novaAtribuicao === 'aluno' ? {
            ...vinculoAcademicoPersistido,
            disciplinasIds: firebase.firestore.FieldValue.delete()
          } : {
            cursoId: firebase.firestore.FieldValue.delete(),
            disciplinas: firebase.firestore.FieldValue.delete(),
            disciplinasKeys: firebase.firestore.FieldValue.delete(),
            professoresPorDisciplina: firebase.firestore.FieldValue.delete(),
            disciplinasIds: novaAtribuicao === 'professor' ? (usuarioAtual.disciplinasIds || []) : firebase.firestore.FieldValue.delete()
          })
        })
        .then(async () => {
          if (novaAtribuicao === 'professor') {
            await db.collection('usuarios').doc(usuarioAtual.id).update({
              disciplinasIds,
              disciplinas: firebase.firestore.FieldValue.delete(),
              disciplinasKeys: firebase.firestore.FieldValue.delete()
            });
            const courseIds = [...new Set(disciplinasProfessorDisponiveis
              .filter(item => disciplinasIds.includes(item.chave))
              .flatMap(item => item.cursoIds))];
            await Promise.all(courseIds.map(async courseId => {
              const courseDoc = await firebase.firestore().collection('cursos').doc(courseId).get();
              if (courseDoc.exists) await window.academicWorkflow.notifyCourseProfessors(firebase.firestore(), courseId, { id: courseDoc.id, ...courseDoc.data() });
              await window.academicWorkflow.syncCourseStudentTeachers(firebase.firestore(), courseId);
            }));
          } else if (novaAtribuicao === 'aluno') {
            await window.academicWorkflow.syncStudentRosters(firebase.firestore(), usuarioAtual.id, {
              ...vinculoAcademicoPersistido,
              nome: novoNome
            });
          }
          if (window.registrarLogAudit) registrarLogAudit(`Editou o Usuário: ${novoNome} | ${novoCpf}`, 'adm', {novaAtribuicao});
          showToast("Usuário atualizado com sucesso!", "success");
          closeModal();
          findUsers(); // already calls fetchCursos but that's fine
        })
        .catch(error => {
          showToast("Erro ao atualizar: " + error.message, "error");
        });
  }
});

// Função de Toast (Substitui os alerts nativos)
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.classList.add('toast', type);
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Excluir usuário ou curso
document.getElementById('deleteButton').addEventListener('click', async function() {
  if (!usuarioAtual) return;

  if (confirm(`Excluir ${usuarioAtual.nome || 'registro'}?`)) {
    try {
      if (tipoAtual === 'curso') {
        const courseId = usuarioAtual.id;
        const courseRef = firebase.firestore().collection('cursos').doc(courseId);
        const [courseDoc, disciplinaSnapshot] = await Promise.all([
          courseRef.get(),
          firebase.firestore().collection('disciplinas').get()
        ]);

        if (!courseDoc.exists) {
          throw new Error('Curso não encontrado para exclusão.');
        }

        const batch = firebase.firestore().batch();
        batch.delete(courseRef);

        disciplinaSnapshot.docs.forEach(doc => {
          const disciplina = doc.data() || {};
          const cursoIds = Array.isArray(disciplina.cursoIds) ? disciplina.cursoIds.filter(id => id !== courseId) : [];
          if (Array.isArray(disciplina.cursoIds) && cursoIds.length !== disciplina.cursoIds.length) {
            batch.update(doc.ref, { cursoIds });
          }
        });

        await batch.commit();
        if (window.registrarLogAudit) registrarLogAudit(`Excluiu o Curso: ${usuarioAtual.nome}`, 'adm', { cursoId: courseId });
        showToast('Curso excluído!', 'success');
        closeModal();
        findUsers();
        return;
      }

      const nomeExcluido = usuarioAtual.nome;
      const cpfExcluido = usuarioAtual.cpf;
      await firebase.firestore().collection('usuarios').doc(usuarioAtual.id).delete();
      if (window.registrarLogAudit) registrarLogAudit(`Excluiu o Usuário: ${nomeExcluido} | ${cpfExcluido}`, 'adm', {});
      showToast('Usuário excluído!', 'success');
      closeModal();
      findUsers();
    } catch (error) {
      showToast('Erro ao excluir: ' + error.message, 'error');
    }
  }
});
