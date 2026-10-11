// Configuração do Supabase (Substitua pelas suas chaves reais)
const SUPABASE_URL = 'https://xgnjkghwnqqekxyumzmh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v2Q-jBba3-V_fozjyyUieg_z-ZZmvyM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const cardSim = document.getElementById('card-sim');
    const cardNao = document.getElementById('card-nao');
    const radioSim = document.getElementById('camisa-sim');
    const radioNao = document.getElementById('camisa-nao');
    const viewShirtBtn = document.getElementById('view-shirt-btn');
    const modal = document.getElementById('shirt-modal');
    const closeModal = document.querySelector('.close-modal');

    // Alternar seleção de camisa visualmente
    function updateShirtSelection(choice) {
        if (choice === 'sim') {
            cardSim.classList.add('selected');
            cardNao.classList.remove('selected');
            radioSim.checked = true;
        } else {
            cardNao.classList.add('selected');
            cardSim.classList.remove('selected');
            radioNao.checked = true;
        }
    }

    cardSim.addEventListener('click', () => updateShirtSelection('sim'));
    cardNao.addEventListener('click', () => updateShirtSelection('não'));

    radioSim.addEventListener('change', () => { if(radioSim.checked) updateShirtSelection('sim'); });
    radioNao.addEventListener('change', () => { if(radioNao.checked) updateShirtSelection('não'); });

    // Modal da Camisa
    viewShirtBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modal.style.display = 'flex';
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    // Gerador de código do ingresso
    function generateIngressoCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'SHINE26-';
        for (let i = 0; i < 5; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Botão PAGAR ONLINE
    document.getElementById('btn-online').addEventListener('click', async () => {
        const name = document.getElementById('name').value.trim();
        const tell = document.getElementById('tell').value.trim();
        const camisa = document.querySelector('input[name="camisa"]:checked').value;

        if (!name || !tell) {
            alert('Por favor, preencha seu nome e telefone.');
            return;
        }

        const ingressoCode = generateIngressoCode();

        // Salvar pendente no Supabase
        const { data, error } = await supabaseClient
            .from('ingressos')
            .insert([{
                name: name,
                tell: parseFloat(tell.replace(/\D/g, '')),
                camisa: camisa,
                status: 'pendente',
                ingresso: ingressoCode
            }])
            .select();

        if (error || !data || data.length === 0) {
            console.error('Erro ao salvar no Supabase:', error);
            alert('Erro ao processar inscrição. Tente novamente.');
            return;
        }

        // Recupera o ID do pedido gerado pelo Supabase para vincular ao order_nsu
        const insertedOrder = data[0];
        const orderId = insertedOrder.id || ingressoCode;

        // Salvar dados temporários no localStorage para recuperação imediata após redirect
        localStorage.setItem('shine_temp_ingresso', JSON.stringify({ name, tell, ingresso: ingressoCode, camisa }));

        // Configurações para o Checkout da InfinitePay via URL direta
        const handle = 'nayannealmeidq';
        const redirectUrl = 'https://lagoinhacearamirim.github.io/shine/meu-ingresso/meu-ingresso.html';
        const webhookUrl = 'https://xgnjkghwnqqekxyumzmh.supabase.co/functions/v1/infinitepay-webhook';

        const itemDescription = camisa === 'sim' 
            ? 'Inscrição Conferência Shine 2026 + Camisa' 
            : 'Inscrição Conferência Shine 2026';
        const itemPrice = camisa === 'sim' ? 8500 : 4000;

        const itemsJSON = JSON.stringify([{
            name: itemDescription,
            price: itemPrice,
            quantity: 1
        }]);

        const checkoutUrl = `https://checkout.infinitepay.io/${handle}?items=${encodeURIComponent(itemsJSON)}&redirect_url=${encodeURIComponent(redirectUrl)}&webhook_url=${encodeURIComponent(webhookUrl)}&order_nsu=${encodeURIComponent(String(orderId))}`;

        window.location.href = checkoutUrl;
    });

    // Botão PAGAR EM ESPÉCIE
    document.getElementById('btn-especie').addEventListener('click', async () => {
        const name = document.getElementById('name').value.trim();
        const tell = document.getElementById('tell').value.trim();
        const camisa = document.querySelector('input[name="camisa"]:checked').value;

        if (!name || !tell) {
            alert('Por favor, preencha seu nome e telefone.');
            return;
        }

        const ingressoCode = generateIngressoCode();
        const valor = camisa === 'sim' ? 'R$ 85,00' : 'R$ 40,00';

        const { error } = await supabaseClient
            .from('ingressos')
            .insert([{
                name: name,
                tell: parseFloat(tell.replace(/\D/g, '')),
                camisa: camisa,
                status: 'pendente_especie',
                ingresso: ingressoCode
            }]);

        if (error) {
            console.error('Erro:', error);
            alert('Erro ao registrar inscrição.');
            return;
        }

        alert(`Inscrição registrada com sucesso para pagamento em espécie!\n\nValor a pagar: ${valor}\nCódigo do Ingresso: ${ingressoCode}\n\nProcure a liderança para efetuar o pagamento e liberar o ingresso.`);
        
        localStorage.setItem('shine_temp_ingresso', JSON.stringify({ name, tell, ingresso: ingressoCode, camisa, status: 'pendente_especie' }));
        window.location.href = 'meu-ingresso.html';
    });
});
