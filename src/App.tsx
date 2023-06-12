import { Component, createSignal, For, onMount } from 'solid-js';

interface IMessage {
        sender: string,
        body: string,
        date: number
    }

const App: Component = () => {
    const [userName, setUserName] = createSignal("");
    const [messages, setMessages] = createSignal([] as IMessage[])
    const [message, setMessage] = createSignal("");

    onMount(() => {
        if (!(userName.length > 1)) {
            window.name_modal.showModal();
        }
    })
    
    const server = new WebSocket("ws://localhost:8080/");
    
    const sendMessage = (e) => {
        e.preventDefault();
        if (message().length > 0) {
            server.send(JSON.stringify({
                sender: userName(),
                body: message()
            }));
            setMessage("");
        }
    }

    server.addEventListener("message", (event) => {
        setMessages([JSON.parse(event.data), ...messages()]);
        window.scrollTo(0, document.body.scrollHeight);
    })

    return (
        <main class="w-full h-full pt-2 mb-24">
            <For each={messages().sort((a, b) => a.date - b.date)}>
                {(message: IMessage) => (
                    <div class={userName() == message.sender ? "chat chat-end" : "chat chat-start"}>
                        <small>{message.sender}</small>
                        <div class={userName() == message.sender ? "chat-bubble chat-bubble-success" : "chat-bubble chat-bubble-info"}>{message.body}</div>
                    </div>
                )}
            </For>
            
            { /* Send a message */ }
            <div class="fixed inset-x-0 bottom-0 flex justify-center items-center p-4">
                <form class="flex items-center" onSubmit={sendMessage}>
                    <input value={message()} onInput={(e: HTMLInputElement) => setMessage(e.target.value)} type="text" placeholder="Type here" class="input input-bordered w-full max-w-xs mr-1" /><button type="submit" class="text-4xl">➡️</button>
                </form>
            </div>

            { /* Username modal */ }
            <dialog id="name_modal" class="modal">
                <form method="dialog" class="modal-box">
                    <h3 class="font-bold text-lg">Pick Your Name</h3>
                    <input value={userName()} onInput={(e: HTMLInputElement) => setUserName(e.target.value)} class="input input-bordered w-full max-w-xs mt-2" type="text" placeholder="username" required />
                    <div class="modal-action">
                       <button class="btn btn-success">Enter</button>
                    </div>
                </form>
            </dialog>
        </main>
    );
};

export default App;
