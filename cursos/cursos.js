(function () {
    const courseIdsByPath = {
        '/cursos/vigilante/vigilante.html': 'vigilante',
        '/cursos/escoltaArm/escolta.html': 'escoltaArm',
        '/cursos/grandes%20eventos/grandesEventos.html': 'grandesEventos',
        '/cursos/Reciclagem/reciclagem.html': 'Reciclagem',
        '/cursos/armasNaoLetais/armasNaoLetais.html': 'armasNaoLetais'
    };

    function formatPrice(value) {
        if (typeof value === 'number') {
            return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        }
        const text = String(value || '').trim();
        return text ? (text.toLowerCase().startsWith('r$') ? text : `R$ ${text}`) : 'Consulte';
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value || 'A definir';
    }

    async function loadCourse() {
        const courseId = courseIdsByPath[window.location.pathname] || window.location.pathname.split('/').slice(-2, -1)[0];
        if (!courseId || typeof db === 'undefined') return;

        try {
            const snapshot = await db.collection('cursos').doc(courseId).get();
            if (!snapshot.exists) {
                setText('curso-preco', 'Consulte');
                setText('curso-carga', 'A definir');
                setText('curso-data', 'A definir');
                return;
            }

            const course = snapshot.data() || {};
            setText('curso-preco', formatPrice(course.preco));
            setText('curso-carga', course.cargaHoraria || course.cargaHr || 'A definir');
            setText('curso-data', course.proximaTurma || course.dataTurma || 'A definir');
        } catch (error) {
            console.error('Erro ao carregar curso:', error);
            setText('curso-preco', 'Consulte');
            setText('curso-carga', 'A definir');
            setText('curso-data', 'A definir');
        }
    }

    window.logout = function () {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            window.location.href = '/login/login.html';
            return;
        }
        firebase.auth().signOut().finally(() => {
            window.location.href = '/index/index.html';
        });
    };

    document.addEventListener('DOMContentLoaded', loadCourse);
}());
