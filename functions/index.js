const { onCall, HttpsError } = require('firebase-functions/v1/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `O campo ${field} e obrigatorio.`);
  }
  return value.trim();
}

exports.createStudentAccount = onCall(async (data, context) => {
  if (!context.auth) {
    throw new HttpsError('unauthenticated', 'E necessario estar autenticado.');
  }

  const operatorSnapshot = await db.collection('usuarios').doc(context.auth.uid).get();
  const operatorRole = operatorSnapshot.data()?.atribuicao;
  if (!['funcionario', 'admin', 'adm'].includes(operatorRole)) {
    throw new HttpsError('permission-denied', 'Sem permissao para cadastrar alunos.');
  }

  const studentData = data || {};
  const email = requiredString(studentData.email, 'e-mail').toLowerCase();
  const confirmEmail = requiredString(studentData.confirmEmail, 'confirmacao do e-mail').toLowerCase();
  const password = requiredString(studentData.password, 'senha');
  const confirmPassword = requiredString(studentData.confirmPassword, 'confirmacao da senha');

  if (email !== confirmEmail) {
    throw new HttpsError('invalid-argument', 'Os e-mails nao coincidem.');
  }
  if (password !== confirmPassword || password.length < 6) {
    throw new HttpsError('invalid-argument', 'As senhas devem coincidir e ter pelo menos 6 caracteres.');
  }

  const profile = {
    nome: requiredString(studentData.nome, 'nome'),
    email,
    cpf: requiredString(studentData.cpf, 'CPF'),
    rg: requiredString(studentData.rg, 'RG'),
    orgaoRg: requiredString(studentData.orgaoRg, 'orgao expedidor'),
    endereco: requiredString(studentData.endereco, 'endereco'),
    telefone: requiredString(studentData.telefone, 'telefone'),
    telefoneAlt: typeof studentData.telefoneAlt === 'string' ? studentData.telefoneAlt.trim() : '',
    formaPagamento: typeof studentData.formaPagamento === 'string' ? studentData.formaPagamento.trim() : '',
    cursoSolicitado: typeof studentData.cursoSolicitado === 'string' ? studentData.cursoSolicitado.trim() : '',
    dataInicio: requiredString(studentData.dataInicio, 'previsao de inicio'),
    turno: requiredString(studentData.turno, 'turno'),
    idade: requiredString(String(studentData.idade ?? ''), 'idade'),
    atribuicao: 'aluno',
    createdAt: FieldValue.serverTimestamp(),
    dataCadastro: FieldValue.serverTimestamp(),
    cadastradoPor: context.auth.uid
  };

  let createdUser;
  try {
    createdUser = await getAuth().createUser({ email, password });
    await db.collection('usuarios').doc(createdUser.uid).set(profile);
  } catch (error) {
    if (createdUser) {
      await getAuth().deleteUser(createdUser.uid).catch(() => {});
    }
    if (error instanceof HttpsError) throw error;
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Este e-mail ja esta cadastrado.');
    }
    console.error('Erro ao criar conta de aluno:', error);
    throw new HttpsError('internal', 'Nao foi possivel cadastrar o aluno.');
  }

  return { uid: createdUser.uid };
});