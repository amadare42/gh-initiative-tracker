interface CallbackSub<TArgs extends any[] = [void]> {
    callback: (...args: TArgs) => void;
    once: boolean;
}

export class CallbackEvent<TArgs extends any[] = [void]> {
    private callbacks: CallbackSub<TArgs>[] = [];

    public add(callback: (...args: TArgs) => void, once = true) {
        this.callbacks.push({ callback, once });
    }

    public once(callback: (...args: TArgs) => void) {
        this.add(callback, true);
    }

    public waitFor() {
        return new Promise<void>(resolve => this.once(resolve as any));
    }

    public remove(callback: (...args: TArgs) => void) {
        this.callbacks = this.callbacks.filter(c => c.callback !== callback);
    }

    public invoke(...args: TArgs) {
        this.callbacks.forEach(c => {
            try {
                c.callback(...args);
            } catch (e) {
                console.error(e);
            }
            if (c.once) {
                this.remove(c.callback);
            }
        });
    }
}
