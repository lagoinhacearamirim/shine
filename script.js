// Configuração do Supabase
const SUPABASE_URL = 'https://xgnjkghwnqqekxyumzmh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_v2Q-jBba3-V_fozjyyUieg_z-ZZmvyM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const cardSim = document.getElementById('card-sim');
    const cardNao = document.getElementById('card-nao');
    const cardSomente = document.getElementById('card-somente');
    const radioSim = document.getElementById('camisa-sim');
    const radioNao = document.getElementById('camisa-nao');
    const radioSomente = document.getElementById('camisa-somente');
    const shirtSizeContainer = document.getElementById('shirt-size-container');
    const tamanhoCamisaSelect = document.getElementById('tamanho-camisa');
    const viewShirtBtn = document.getElementById('view-shirt-btn');
    const modal = document.getElementById('shirt-modal');
    const closeModal = document.querySelector('.close-modal');
    const especieModal = document.getElementById('especie-success-modal');
    const especieMsg = document.getElementById('especie-success-msg');
    const especieBtnClose = document.getElementById('especie-btn-close');
    const btnProgramacao = document.getElementById('btn-programacao');
    const programacaoDialog = document.getElementById('programacao-dialog');
    const programacaoBtnClose = document.getElementById('programacao-btn-close');

    if (btnProgramacao && programacaoDialog) {
        btnProgramacao.addEventListener('click', () => {
            if (typeof programacaoDialog.showModal === 'function') {
                programacaoDialog.showModal();
            }
        });
    }

    if (programacaoBtnClose && programacaoDialog) {
        programacaoBtnClose.addEventListener('click', () => {
            programacaoDialog.close();
        });
    }

    // Controle automático do estoque: 50 registros existentes + 10 camisas restantes.
    const SHIRT_SIZES = ['P', 'M', 'G', 'GG'];
    const soldoutDialog = document.getElementById('shirts-soldout-dialog');
    const soldoutClose = document.getElementById('soldout-close');
    let shirtStockReady = false;
    let shirtStockSoldOut = false;
    let shirtStock = { P: 0, M: 0, G: 0, GG: 0 };

    // As opções ficam temporariamente bloqueadas até a consulta segura do estoque.
    radioSim.disabled = true;
    radioSomente.disabled = true;

    function updateShirtSizeOptions(stock) {
        if (!tamanhoCamisaSelect) return;

        Array.from(tamanhoCamisaSelect.options).forEach(option => {
            const size = option.value;
            if (!SHIRT_SIZES.includes(size)) return;

            const remaining = Number(stock[size]) || 0;
            option.textContent = remaining > 0
                ? `${size} — ${remaining} ${remaining === 1 ? 'restante' : 'restantes'}`
                : `${size} — Esgotado`;
        });
    }

    function setShirtStockState(stock) {
        shirtStock = stock;
        shirtStockReady = true;

        const totalRemaining = SHIRT_SIZES.reduce((sum, size) => sum + (Number(stock[size]) || 0), 0);
        shirtStockSoldOut = totalRemaining <= 0;

        radioSim.disabled = shirtStockSoldOut;
        radioSomente.disabled = shirtStockSoldOut;
        cardSim.classList.toggle('sold-out', shirtStockSoldOut);
        cardSomente.classList.toggle('sold-out', shirtStockSoldOut);

        updateShirtSizeOptions(stock);
    }

    function showSoldOutMessage(event, reason = 'all') {
        if (event) event.preventDefault();

        let message;
        if (!shirtStockReady) {
            message = 'Não foi possível confirmar o estoque das camisas. Atualize a página e tente novamente.';
        } else if (reason === 'size') {
            message = 'Desculpe, este tamanho esgotou 😅...';
        } else {
            message = 'Desculpe, as camisas acabaram 😅...';
        }

        const messageElement = soldoutDialog && soldoutDialog.querySelector('p');
        if (messageElement) messageElement.textContent = message;

        if (soldoutDialog && typeof soldoutDialog.showModal === 'function') {
            soldoutDialog.showModal();
        } else {
            alert(message);
        }
    }

    async function refreshShirtStock() {
        const { data, error } = await supabaseClient.rpc('get_shirt_stock');
        if (error) throw error;

        const stock = { P: 0, M: 0, G: 0, GG: 0 };
        (data || []).forEach(row => {
            const size = String(row.size || '').toUpperCase();
            if (SHIRT_SIZES.includes(size)) {
                stock[size] = Math.max(0, Number(row.remaining) || 0);
            }
        });

        setShirtStockState(stock);
        return stock;
    }

    async function ensureShirtStockAvailable(camisa, tamanhoCamisa) {
        if (camisa !== 'sim' && camisa !== 'somente') return true;

        try {
            const stock = await refreshShirtStock();
            const totalRemaining = SHIRT_SIZES.reduce((sum, size) => sum + stock[size], 0);

            if (totalRemaining <= 0) {
                showSoldOutMessage();
                return false;
            }

            if (!tamanhoCamisa || (stock[tamanhoCamisa] || 0) <= 0) {
                showSoldOutMessage(null, 'size');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Não foi possível consultar o estoque de camisas:', error);
            alert('Não foi possível verificar a disponibilidade das camisas. Tente novamente em instantes.');
            return false;
        }
    }

    cardSim.addEventListener('click', (event) => {
        if (!shirtStockReady || shirtStockSoldOut) showSoldOutMessage(event);
    });
    cardSomente.addEventListener('click', (event) => {
        if (!shirtStockReady || shirtStockSoldOut) showSoldOutMessage(event);
    });

    if (soldoutClose && soldoutDialog) {
        soldoutClose.addEventListener('click', () => soldoutDialog.close());
    }

    // Se a pessoa escolher um tamanho que acabou de esgotar, avisa imediatamente.
    if (tamanhoCamisaSelect) {
        tamanhoCamisaSelect.addEventListener('change', async () => {
            const selectedSize = tamanhoCamisaSelect.value;
            if (!selectedSize) return;

            try {
                const stock = await refreshShirtStock();
                const totalRemaining = SHIRT_SIZES.reduce((sum, size) => sum + stock[size], 0);

                if (totalRemaining <= 0) {
                    tamanhoCamisaSelect.value = '';
                    showSoldOutMessage();
                } else if ((stock[selectedSize] || 0) <= 0) {
                    tamanhoCamisaSelect.value = '';
                    showSoldOutMessage(null, 'size');
                }
            } catch (error) {
                console.error('Falha ao verificar o tamanho selecionado:', error);
                tamanhoCamisaSelect.value = '';
                alert('Não foi possível verificar este tamanho agora. Tente novamente.');
            }
        });
    }

    // Atualiza os tamanhos e libera as modalidades que ainda possuem estoque.
    refreshShirtStock().catch(error => {
        console.error('Falha ao carregar o estoque de camisas:', error);
    });

    // Alternar seleção de camisa visualmente
    function updateShirtSelection(choice) {
        cardSim.classList.toggle('selected', choice === 'sim');
        cardNao.classList.toggle('selected', choice === 'não');
        cardSomente.classList.toggle('selected', choice === 'somente');

        radioSim.checked = choice === 'sim';
        radioNao.checked = choice === 'não';
        radioSomente.checked = choice === 'somente';

        const precisaCamisa = choice === 'sim' || choice === 'somente';
        if (shirtSizeContainer) shirtSizeContainer.style.display = precisaCamisa ? 'block' : 'none';
        if (!precisaCamisa && tamanhoCamisaSelect) tamanhoCamisaSelect.value = '';
    }

    cardNao.addEventListener('click', () => updateShirtSelection('não'));
    radioNao.addEventListener('change', () => { if (radioNao.checked) updateShirtSelection('não'); });
    async function confirmShirtChoice(choice) {
        try {
            const stock = await refreshShirtStock();
            const totalRemaining = SHIRT_SIZES.reduce((sum, size) => sum + stock[size], 0);

            if (totalRemaining <= 0) {
                updateShirtSelection('não');
                showSoldOutMessage();
                return;
            }

            updateShirtSelection(choice);
        } catch (error) {
            console.error('Falha ao confirmar disponibilidade das camisas:', error);
            updateShirtSelection('não');
            alert('Não foi possível confirmar o estoque das camisas. Tente novamente.');
        }
    }

    radioSim.addEventListener('change', () => {
        if (radioSim.checked) confirmShirtChoice('sim');
    });
    radioSomente.addEventListener('change', () => {
        if (radioSomente.checked) confirmShirtChoice('somente');
    });

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
        document.getElementById('loading-overlay').style.display = 'flex';
        const name = document.getElementById('name').value.trim();
        const tell = document.getElementById('tell').value.trim();
        const camisa = document.querySelector('input[name="camisa"]:checked').value;
        const tamanhoCamisa = (camisa === 'sim' || camisa === 'somente') ? tamanhoCamisaSelect.value : null;

        if (!name || !tell) {
            document.getElementById('loading-overlay').style.display = 'none';
            alert('Por favor, preencha seu nome e telefone.');
            return;
        }

        if ((camisa === 'sim' || camisa === 'somente') && !tamanhoCamisa) {
            document.getElementById('loading-overlay').style.display = 'none';
            alert('Por favor, selecione o tamanho da camisa.');
            return;
        }

        const estoqueDisponivel = await ensureShirtStockAvailable(camisa, tamanhoCamisa);
        if (!estoqueDisponivel) {
            document.getElementById('loading-overlay').style.display = 'none';
            return;
        }

        const ingressoCode = camisa === 'somente' ? null : generateIngressoCode();
        const telefoneNumero = parseFloat(tell.replace(/\D/g, ''));
        const valorTotal = camisa === 'somente' ? 5500 : (camisa === 'sim' ? 8000 : 3000); // Valor em centavos
        const descricaoItem = camisa === 'somente' ? `Camisa Oficial Shine 2026 (${tamanhoCamisa})` : (camisa === 'sim' ? `Inscrição Conferência Shine 2026 + Camisa (${tamanhoCamisa})` : 'Inscrição Conferência Shine 2026');

        // Passo 1: Salva o pedido inicial como pendente no Supabase para obter o ID
        const { data, error } = await supabaseClient
            .from('ingressos')
            .insert([{
                name: name,
                tell: telefoneNumero,
                camisa: camisa,
                tamanho_camisa: tamanhoCamisa,
                status: 'pendente',
                ingresso: ingressoCode,
                total: valorTotal
            }])
            .select();

        if (error || !data || data.length === 0) {
            document.getElementById('loading-overlay').style.display = 'none';
            console.error('Erro ao salvar no Supabase:', error);
            if (error && String(error.message || '').includes('TAMANHO_ESGOTADO')) {
                await refreshShirtStock().catch(stockError => console.error('Falha ao atualizar estoque:', stockError));
                showSoldOutMessage(null, 'size');
                return;
            }
            if (error && String(error.message || '').includes('CAMISAS_ESGOTADAS')) {
                await refreshShirtStock().catch(stockError => console.error('Falha ao atualizar estoque:', stockError));
                showSoldOutMessage();
                return;
            }
            alert('Erro ao processar inscrição. Tente novamente.');
            return;
        }

        if (camisa === 'sim' || camisa === 'somente') {
            await refreshShirtStock().catch(error => console.error('Falha ao atualizar estoque após a reserva:', error));
        }

        // Pega o ID único gerado no banco para usar como order_nsu
        const insertedOrder = data[0];
        const orderId = String(insertedOrder.id);

        // Atualiza a linha recém criada com o order_nsu para manter o mapeamento exato
        await supabaseClient
            .from('ingressos')
            .update({ order_nsu: orderId })
            .eq('id', insertedOrder.id);

        // Salvar dados temporários no localStorage para recuperação imediata após redirect
        localStorage.setItem('shine_temp_ingresso', JSON.stringify({ name, tell, ingresso: ingressoCode, camisa, tamanho_camisa: tamanhoCamisa }));

        // Payload estruturado para a API da InfinitePay com webhook integrado
        const payloadInfinitePay = {
            handle: "nayannealmeidq",
            items: [
                {
                    description: descricaoItem,
                    quantity: 1,
                    price: valorTotal
                }
            ],
            order_nsu: orderId,
            webhook_url: "https://xgnjkghwnqqekxyumzmh.supabase.co/functions/v1/infinitepay-webhook",
            redirect_url: "https://lagoinhacearamirim.github.io/shine/meu-ingresso.html"
        };

        const btnOnline = document.getElementById('btn-online');
        const originalText = btnOnline.innerText;
        btnOnline.innerText = "Gerando pagamento...";
        btnOnline.disabled = true;

        try {
            const response = await fetch('https://api.checkout.infinitepay.io/links', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payloadInfinitePay)
            });

            if (!response.ok) {
                throw new Error(`Erro API InfinitePay HTTP: ${response.status}`);
            }

            const responseData = await response.json();
            let checkoutUrl = responseData.url || responseData.link || (responseData.data && responseData.data.url);

            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                document.getElementById('loading-overlay').style.display = 'none';
                console.error("Resposta da InfinitePay sem URL:", responseData);
                alert('Link de checkout ausente retornado pela InfinitePay.');
                btnOnline.innerText = originalText;
                btnOnline.disabled = false;
            }

        } catch (err) {
            document.getElementById('loading-overlay').style.display = 'none';
            console.error('Erro na operação:', err);
            alert('Erro ao conectar com a InfinitePay. Tente novamente.');
            btnOnline.innerText = originalText;
            btnOnline.disabled = false;
        }
    });

   // Botão PAGAR EM ESPÉCIE
    document.getElementById('btn-especie').addEventListener('click', async () => {
        document.getElementById('loading-overlay').style.display = 'flex';
        const name = document.getElementById('name').value.trim();
        const tell = document.getElementById('tell').value.trim();
        const camisa = document.querySelector('input[name="camisa"]:checked').value;
        const tamanhoCamisa = (camisa === 'sim' || camisa === 'somente') ? tamanhoCamisaSelect.value : null;

        if (!name || !tell) {
            document.getElementById('loading-overlay').style.display = 'none';
            alert('Por favor, preencha seu nome e telefone.');
            return;
        }

        if ((camisa === 'sim' || camisa === 'somente') && !tamanhoCamisa) {
            document.getElementById('loading-overlay').style.display = 'none';
            alert('Por favor, selecione o tamanho da camisa.');
            return;
        }

        const estoqueDisponivel = await ensureShirtStockAvailable(camisa, tamanhoCamisa);
        if (!estoqueDisponivel) {
            document.getElementById('loading-overlay').style.display = 'none';
            return;
        }

        const ingressoCode = camisa === 'somente' ? null : generateIngressoCode();
        const valor = camisa === 'somente' ? 'R$ 55,00' : (camisa === 'sim' ? 'R$ 80,00' : 'R$ 30,00');
        const valorTotal = camisa === 'somente' ? 5500 : (camisa === 'sim' ? 8000 : 3000);

        const { error } = await supabaseClient
            .from('ingressos')
            .insert([{
                name: name,
                tell: parseFloat(tell.replace(/\D/g, '')),
                camisa: camisa,
                tamanho_camisa: tamanhoCamisa,
                status: 'pendente_especie',
                ingresso: ingressoCode,
                total: valorTotal
            }]);

        if (error) {
            document.getElementById('loading-overlay').style.display = 'none';
            console.error('Erro:', error);
            if (String(error.message || '').includes('TAMANHO_ESGOTADO')) {
                await refreshShirtStock().catch(stockError => console.error('Falha ao atualizar estoque:', stockError));
                showSoldOutMessage(null, 'size');
                return;
            }
            if (String(error.message || '').includes('CAMISAS_ESGOTADAS')) {
                await refreshShirtStock().catch(stockError => console.error('Falha ao atualizar estoque:', stockError));
                showSoldOutMessage();
                return;
            }
            alert('Erro ao registrar inscrição.');
            return;
        }
        
        if (camisa === 'sim' || camisa === 'somente') {
            await refreshShirtStock().catch(error => console.error('Falha ao atualizar estoque após a reserva:', error));
        }

        const successTitle = document.getElementById('especie-success-title');
        especieBtnClose.textContent = camisa === 'somente' ? 'OK, Consultar Compra' : 'OK, Ver Meu Ingresso';
        if (successTitle) successTitle.textContent = camisa === 'somente' ? 'Compra registrada!' : 'Inscrição Realizada!';
        especieMsg.innerHTML = camisa === 'somente'
            ? `Compra da camisa registrada para pagamento em espécie!<br><br>
                <strong>Valor a pagar:</strong> ${valor}<br>
                <strong>Tamanho da camisa:</strong> ${tamanhoCamisa}<br><br>
                Procure a liderança para efetuar o pagamento. O cupom fiscal ficará disponível após a confirmação.`
            : `Inscrição registrada com sucesso para pagamento em espécie!<br><br>
                <strong>Valor a pagar:</strong> ${valor}<br>
                ${camisa === 'sim' ? `<strong>Tamanho da Camisa:</strong> ${tamanhoCamisa}<br>` : ''}
                <strong>Código do Ingresso:</strong> ${ingressoCode}<br><br>
                Procure a liderança para efetuar o pagamento e liberar o ingresso.`;

        localStorage.setItem('shine_temp_ingresso', JSON.stringify({ name, tell, ingresso: ingressoCode, camisa, tamanho_camisa: tamanhoCamisa, status: 'pendente_especie' }));

        document.getElementById('loading-overlay').style.display = 'none';

        if (especieModal && typeof especieModal.showModal === 'function') {
            especieModal.showModal();
        } else {
            if (camisa === 'somente') {
                alert(`Compra da camisa registrada para pagamento em espécie!\n\nValor a pagar: ${valor}\nTamanho: ${tamanhoCamisa}\n\nProcure a liderança para efetuar o pagamento.`);
            } else {
                alert(`Inscrição registrada com sucesso para pagamento em espécie!\n\nValor a pagar: ${valor}\nCódigo do Ingresso: ${ingressoCode}\n\nProcure a liderança para efetuar o pagamento e liberar o ingresso.`);
            }
            window.location.href = 'meu-ingresso.html';
        }

        especieBtnClose.onclick = () => {
            especieModal.close();
            window.location.href = 'meu-ingresso.html';
        };
    });
});
