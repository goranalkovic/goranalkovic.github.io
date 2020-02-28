
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const logoSrc = writable("img/logo/logo-v4.svg");
    const animationClass = writable("");
    const s1Height = writable(0);
    const s2Height = writable(0);
    const s3Height = writable(0);
    const s4Height = writable(0);

    /* src\components\BrandLogo.svelte generated by Svelte v3.19.1 */
    const file = "src\\components\\BrandLogo.svelte";

    function create_fragment(ctx) {
    	let img;
    	let img_class_value;
    	let img_src_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "alt", "Goran Alković");
    			attr_dev(img, "class", img_class_value = "h-20 rounded shadow-lg cursor-pointer " + /*animClass*/ ctx[2] + " " + /*customClass*/ ctx[0]);
    			if (img.src !== (img_src_value = /*src*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 69, 0, 1380);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    			dispose = listen_dev(img, "click", /*swapLogo*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*animClass, customClass*/ 5 && img_class_value !== (img_class_value = "h-20 rounded shadow-lg cursor-pointer " + /*animClass*/ ctx[2] + " " + /*customClass*/ ctx[0])) {
    				attr_dev(img, "class", img_class_value);
    			}

    			if (dirty & /*src*/ 2 && img.src !== (img_src_value = /*src*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getRandomInt(min, max, exclude) {
    	let num = exclude;

    	while (num === exclude) {
    		num = Math.floor(Math.random() * (max - min + 1) + min);
    	}

    	return num;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { customClass } = $$props;
    	let { small = false } = $$props;
    	let canSwap = true;
    	let src;

    	const unsubscribe = logoSrc.subscribe(value => {
    		$$invalidate(1, src = value);
    	});

    	logoSrc.set(getNewImg());

    	// src = getNewImg();
    	let animClass;

    	const unsubscribe2 = animationClass.subscribe(value => {
    		$$invalidate(2, animClass = value);
    	});

    	function swapLogo() {
    		// Check if it's ok to swap
    		if (!canSwap) return;

    		// Disallow swapping
    		canSwap = false;

    		// Start animation
    		animationClass.set("animated jello");

    		// Swap logo
    		setTimeout(
    			() => {
    				logoSrc.set(getNewImg());
    			},
    			450
    		);

    		// Remove animation
    		setTimeout(
    			() => {
    				animationClass.set("");
    				canSwap = true;
    			},
    			850
    		);
    	}

    	function getNewImg() {
    		let currentVersion = src.slice(-5, -4);
    		let newVersion = getRandomInt(1, 9, currentVersion);

    		while (newVersion === currentVersion) {
    			newVersion = getRandomInt(1, 9);
    		}

    		return `img/logo/logo-v${newVersion}.svg`;
    	}

    	const writable_props = ["customClass", "small"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<BrandLogo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("customClass" in $$props) $$invalidate(0, customClass = $$props.customClass);
    		if ("small" in $$props) $$invalidate(4, small = $$props.small);
    	};

    	$$self.$capture_state = () => ({
    		logoSrc,
    		animationClass,
    		customClass,
    		getRandomInt,
    		small,
    		canSwap,
    		src,
    		unsubscribe,
    		animClass,
    		unsubscribe2,
    		swapLogo,
    		getNewImg,
    		Math,
    		smallClass,
    		setTimeout
    	});

    	$$self.$inject_state = $$props => {
    		if ("customClass" in $$props) $$invalidate(0, customClass = $$props.customClass);
    		if ("small" in $$props) $$invalidate(4, small = $$props.small);
    		if ("canSwap" in $$props) canSwap = $$props.canSwap;
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    		if ("animClass" in $$props) $$invalidate(2, animClass = $$props.animClass);
    		if ("smallClass" in $$props) smallClass = $$props.smallClass;
    	};

    	let smallClass;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*small*/ 16) {
    			 smallClass = small ? "brand-img-menu" : "";
    		}
    	};

    	return [customClass, src, animClass, swapLogo, small];
    }

    class BrandLogo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { customClass: 0, small: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BrandLogo",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*customClass*/ ctx[0] === undefined && !("customClass" in props)) {
    			console.warn("<BrandLogo> was created without expected prop 'customClass'");
    		}
    	}

    	get customClass() {
    		throw new Error("<BrandLogo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set customClass(value) {
    		throw new Error("<BrandLogo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get small() {
    		throw new Error("<BrandLogo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set small(value) {
    		throw new Error("<BrandLogo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Hero.svelte generated by Svelte v3.19.1 */
    const file$1 = "src\\components\\Hero.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div1;
    	let div0;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let p1;
    	let t4;
    	let br0;
    	let t5;
    	let br1;
    	let t6;
    	let t7;
    	let t8;
    	let a;
    	let i;
    	let t9;
    	let span;
    	let current;

    	const brandlogo = new BrandLogo({
    			props: { customClass: "-mb-6 md:-mb-10 md:-mr-16" },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Goran Alković";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Designer and developer";
    			t3 = space();
    			p1 = element("p");
    			t4 = text("I'm a bachelor of informatics from Varaždin, Croatia.\r\n        ");
    			br0 = element("br");
    			t5 = text("\r\n        Always learning new things and doing amazing stuff with things I already\r\n        know.\r\n        ");
    			br1 = element("br");
    			t6 = text("\r\n        I love all kinds of design, but I also love making something amazing out\r\n        of my designs.");
    			t7 = space();
    			create_component(brandlogo.$$.fragment);
    			t8 = space();
    			a = element("a");
    			i = element("i");
    			t9 = space();
    			span = element("span");
    			span.textContent = "Get the CV";
    			attr_dev(h1, "class", "mt-6 md:mt-0 font-semibold font-display text-2xl text-purple-700\r\n        leading-none");
    			add_location(h1, file$1, 19, 6, 1291);
    			attr_dev(p0, "class", "font-display text-gray-800");
    			add_location(p0, file$1, 24, 6, 1443);
    			add_location(br0, file$1, 27, 8, 1635);
    			add_location(br1, file$1, 30, 8, 1748);
    			attr_dev(p1, "class", "mt-4 md:mt-2 text-sm text-gray-700 ");
    			add_location(p1, file$1, 25, 6, 1515);
    			attr_dev(div0, "class", "text-center md:text-left p-4 bg-white rounded-lg shadow-lg\r\n      leading-relaxed");
    			add_location(div0, file$1, 16, 4, 1181);
    			attr_dev(div1, "class", "flex flex-col-reverse items-center md:items-end w-10/12 md:w-auto");
    			add_location(div1, file$1, 13, 2, 1089);
    			attr_dev(i, "class", "icon-doc mr-1");
    			add_location(i, file$1, 40, 2, 2271);
    			attr_dev(span, "class", "inline-block");
    			add_location(span, file$1, 41, 2, 2304);
    			attr_dev(a, "href", "files/Goran_Alkovic_CV.pdf");
    			attr_dev(a, "class", "mt-6 -mb-4 bg-purple-200 border border-purple-300 py-1 px-2 text-purple-500 flex items-baseline justify-center rounded hover:border-purple-700 hover:text-purple-100 hover:bg-purple-700 select-none transition-border transition-bg transition-color transition-500");
    			add_location(a, file$1, 39, 2, 1961);
    			attr_dev(section, "class", "bg-purple-200 bg-texture py-8 md:py-10 flex flex-col items-center justify-center select-none svelte-vzfb0w");
    			add_location(section, file$1, 10, 0, 970);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div0, t3);
    			append_dev(div0, p1);
    			append_dev(p1, t4);
    			append_dev(p1, br0);
    			append_dev(p1, t5);
    			append_dev(p1, br1);
    			append_dev(p1, t6);
    			append_dev(div1, t7);
    			mount_component(brandlogo, div1, null);
    			append_dev(section, t8);
    			append_dev(section, a);
    			append_dev(a, i);
    			append_dev(a, t9);
    			append_dev(a, span);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(brandlogo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(brandlogo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(brandlogo);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	$$self.$capture_state = () => ({ BrandLogo });
    	return [];
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hero",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\components\SectionHeader.svelte generated by Svelte v3.19.1 */

    const { console: console_1 } = globals;
    const file$2 = "src\\components\\SectionHeader.svelte";

    function create_fragment$2(ctx) {
    	let t0;
    	let div;
    	let h1;
    	let t1;
    	let div_id_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div = element("div");
    			h1 = element("h1");
    			t1 = text(/*text*/ ctx[1]);
    			attr_dev(h1, "class", "text-3xl font-display px-4 py-2 rounded text-gray-800");
    			add_location(h1, file$2, 33, 4, 924);
    			attr_dev(div, "class", "flex justify-center mx-2 my-6");
    			attr_dev(div, "id", div_id_value = "#" + /*id*/ ctx[0]);
    			add_location(div, file$2, 32, 0, 847);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(h1, t1);
    			/*div_binding*/ ctx[4](div);
    			dispose = listen_dev(document.body, "resize", /*refreshSizes*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 2) set_data_dev(t1, /*text*/ ctx[1]);

    			if (dirty & /*id*/ 1 && div_id_value !== (div_id_value = "#" + /*id*/ ctx[0])) {
    				attr_dev(div, "id", div_id_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			/*div_binding*/ ctx[4](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { id } = $$props;
    	let { text = "" } = $$props;
    	let elem;

    	function refreshSizes() {
    		console.log("Refreshed section header sizes");
    		if (id === "learnmore") s1Height.set(elem.offsetTop);
    		if (id === "skills") s2Height.set(elem.offsetTop);
    		if (id === "work") s3Height.set(elem.offsetTop);
    		if (id === "contact") s4Height.set(elem.offsetTop);
    	}

    	onMount(() => {
    		refreshSizes();
    	});

    	const writable_props = ["id", "text"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<SectionHeader> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, elem = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		s1Height,
    		s2Height,
    		s3Height,
    		s4Height,
    		id,
    		text,
    		elem,
    		refreshSizes,
    		console
    	});

    	$$self.$inject_state = $$props => {
    		if ("id" in $$props) $$invalidate(0, id = $$props.id);
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("elem" in $$props) $$invalidate(2, elem = $$props.elem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [id, text, elem, refreshSizes, div_binding];
    }

    class SectionHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { id: 0, text: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SectionHeader",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*id*/ ctx[0] === undefined && !("id" in props)) {
    			console_1.warn("<SectionHeader> was created without expected prop 'id'");
    		}
    	}

    	get id() {
    		throw new Error("<SectionHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<SectionHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get text() {
    		throw new Error("<SectionHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<SectionHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src\components\SkillList.svelte generated by Svelte v3.19.1 */
    const file$3 = "src\\components\\SkillList.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	child_ctx[8] = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	child_ctx[5] = i;
    	return child_ctx;
    }

    // (53:4) {#if childrenVisible}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*skill*/ ctx[0].items;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1) {
    				each_value = /*skill*/ ctx[0].items;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(53:4) {#if childrenVisible}",
    		ctx
    	});

    	return block;
    }

    // (70:14) {#if itm.subtitle != null}
    function create_if_block_1(ctx) {
    	let br;
    	let t;
    	let span;
    	let raw_value = /*itm*/ ctx[6].subtitle + "";

    	const block = {
    		c: function create() {
    			br = element("br");
    			t = space();
    			span = element("span");
    			add_location(br, file$3, 70, 16, 3213);
    			attr_dev(span, "class", "");
    			add_location(span, file$3, 71, 16, 3237);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, br, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, span, anchor);
    			span.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skill*/ 1 && raw_value !== (raw_value = /*itm*/ ctx[6].subtitle + "")) span.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(70:14) {#if itm.subtitle != null}",
    		ctx
    	});

    	return block;
    }

    // (60:10) {#each item.items as itm, ind (ind)}
    function create_each_block_1(key_1, ctx) {
    	let li;
    	let b;
    	let raw0_value = /*itm*/ ctx[6].name + "";
    	let t0;
    	let t1;
    	let br;
    	let t2;
    	let span;
    	let raw1_value = /*itm*/ ctx[6].level + "";
    	let li_transition;
    	let rect;
    	let stop_animation = noop;
    	let current;
    	let if_block = /*itm*/ ctx[6].subtitle != null && create_if_block_1(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			b = element("b");
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			br = element("br");
    			t2 = space();
    			span = element("span");
    			attr_dev(b, "class", "");
    			add_location(b, file$3, 65, 14, 3085);
    			add_location(br, file$3, 76, 14, 3356);
    			attr_dev(span, "class", "text-xs font-semibold text-gray-600 uppercase\r\n                tracking-widest");
    			add_location(span, file$3, 77, 14, 3378);
    			attr_dev(li, "class", "m-2 md:flex-1");
    			add_location(li, file$3, 60, 12, 2944);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, b);
    			b.innerHTML = raw0_value;
    			append_dev(li, t0);
    			if (if_block) if_block.m(li, null);
    			append_dev(li, t1);
    			append_dev(li, br);
    			append_dev(li, t2);
    			append_dev(li, span);
    			span.innerHTML = raw1_value;
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*skill*/ 1) && raw0_value !== (raw0_value = /*itm*/ ctx[6].name + "")) b.innerHTML = raw0_value;
    			if (/*itm*/ ctx[6].subtitle != null) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(li, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || dirty & /*skill*/ 1) && raw1_value !== (raw1_value = /*itm*/ ctx[6].level + "")) span.innerHTML = raw1_value;		},
    		r: function measure() {
    			rect = li.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(li);
    			stop_animation();
    			add_transform(li, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(li, rect, flip, {});
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!li_transition) li_transition = create_bidirectional_transition(li, slide, { delay: 50 * /*ind*/ ctx[8] }, true);
    				li_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!li_transition) li_transition = create_bidirectional_transition(li, slide, { delay: 50 * /*ind*/ ctx[8] }, false);
    			li_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			if (if_block) if_block.d();
    			if (detaching && li_transition) li_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(60:10) {#each item.items as itm, ind (ind)}",
    		ctx
    	});

    	return block;
    }

    // (54:6) {#each skill.items as item, i}
    function create_each_block(ctx) {
    	let ul;
    	let li;
    	let b;
    	let t0_value = /*item*/ ctx[3].section + "";
    	let t0;
    	let b_class_value;
    	let li_transition;
    	let t1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t2;
    	let ul_transition;
    	let current;
    	let each_value_1 = /*item*/ ctx[3].items;
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*ind*/ ctx[8];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li = element("li");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			attr_dev(b, "class", b_class_value = "" + (/*skill*/ ctx[0].iconColor + " text-xl" + " svelte-1blatth"));
    			add_location(b, file$3, 56, 12, 2808);
    			add_location(li, file$3, 55, 10, 2773);
    			attr_dev(ul, "class", "md:ml-10 flex-grow");
    			add_location(ul, file$3, 54, 8, 2714);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, b);
    			append_dev(b, t0);
    			append_dev(ul, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			append_dev(ul, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*skill*/ 1) && t0_value !== (t0_value = /*item*/ ctx[3].section + "")) set_data_dev(t0, t0_value);

    			if (!current || dirty & /*skill*/ 1 && b_class_value !== (b_class_value = "" + (/*skill*/ ctx[0].iconColor + " text-xl" + " svelte-1blatth"))) {
    				attr_dev(b, "class", b_class_value);
    			}

    			if (dirty & /*skill*/ 1) {
    				const each_value_1 = /*item*/ ctx[3].items;
    				validate_each_argument(each_value_1);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, ul, fix_and_outro_and_destroy_block, create_each_block_1, t2, get_each_context_1);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, true);
    				li_transition.run(1);
    			});

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			add_render_callback(() => {
    				if (!ul_transition) ul_transition = create_bidirectional_transition(ul, fade, {}, true);
    				ul_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, false);
    			li_transition.run(0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			if (!ul_transition) ul_transition = create_bidirectional_transition(ul, fade, {}, false);
    			ul_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			if (detaching && li_transition) li_transition.end();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching && ul_transition) ul_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(54:6) {#each skill.items as item, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let button;
    	let div0;
    	let h4;
    	let span0;
    	let i;
    	let i_class_value;
    	let span0_class_value;
    	let t0;
    	let span1;
    	let t1_value = /*skill*/ ctx[0].name + "";
    	let t1;
    	let h4_class_value;
    	let t2;
    	let p;
    	let p_class_value;
    	let t3;
    	let div1;
    	let div1_transition;
    	let button_class_value;
    	let current;
    	let dispose;
    	let if_block = /*childrenVisible*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			div0 = element("div");
    			h4 = element("h4");
    			span0 = element("span");
    			i = element("i");
    			t0 = space();
    			span1 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(i, "class", i_class_value = "" + (null_to_empty(/*skill*/ ctx[0].icon) + " svelte-1blatth"));
    			add_location(i, file$3, 41, 6, 2278);
    			attr_dev(span0, "class", span0_class_value = "icon " + /*skill*/ ctx[0].iconColor + " svelte-1blatth");
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$3, 40, 4, 2214);
    			attr_dev(span1, "class", "ml-2");
    			add_location(span1, file$3, 43, 4, 2321);
    			attr_dev(h4, "class", h4_class_value = "text-2xl font-display " + (/*childrenVisible*/ ctx[1] ? "font-semibold" : ""));
    			add_location(h4, file$3, 39, 2, 2133);
    			attr_dev(p, "aria-roledescription", "See more");

    			attr_dev(p, "class", p_class_value = "text-gray-400 icon-arrow-down rotate my-1 " + (/*childrenVisible*/ ctx[1]
    			? "rotate-180 mb-4"
    			: "rotate-0") + " svelte-1blatth");

    			add_location(p, file$3, 45, 2, 2372);
    			attr_dev(div0, "class", "flex flex-col md:flex-row md:justify-between items-center w-full");
    			add_location(div0, file$3, 38, 2, 2051);
    			attr_dev(div1, "class", "flex text-center md:text-left justify-center w-full flex-wrap flex-1");
    			add_location(div1, file$3, 49, 2, 2531);
    			attr_dev(button, "aria-describedby", "Skill");

    			attr_dev(button, "class", button_class_value = "bg-white transition-shadow transition-width transition-250 flex items-stretch\r\n  shadow hover:shadow-lg focus:shadow-lg rounded-lg hover:cursor-pointer mx-1 my-4 md:mx-4 p-5 flex flex-col\r\n  items-center text-center select-none " + (/*childrenVisible*/ ctx[1]
    			? "md:w-9/12"
    			: "w-full md:w-4/12 lg:w-3/12") + " " + (/*childrenVisible*/ ctx[1] ? "shadow-lg" : "") + "\r\n  ");

    			add_location(button, file$3, 31, 0, 1640);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, div0);
    			append_dev(div0, h4);
    			append_dev(h4, span0);
    			append_dev(span0, i);
    			append_dev(h4, t0);
    			append_dev(h4, span1);
    			append_dev(span1, t1);
    			append_dev(div0, t2);
    			append_dev(div0, p);
    			append_dev(button, t3);
    			append_dev(button, div1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    			dispose = listen_dev(button, "click", /*toggleChildren*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*skill*/ 1 && i_class_value !== (i_class_value = "" + (null_to_empty(/*skill*/ ctx[0].icon) + " svelte-1blatth"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (!current || dirty & /*skill*/ 1 && span0_class_value !== (span0_class_value = "icon " + /*skill*/ ctx[0].iconColor + " svelte-1blatth")) {
    				attr_dev(span0, "class", span0_class_value);
    			}

    			if ((!current || dirty & /*skill*/ 1) && t1_value !== (t1_value = /*skill*/ ctx[0].name + "")) set_data_dev(t1, t1_value);

    			if (!current || dirty & /*childrenVisible*/ 2 && h4_class_value !== (h4_class_value = "text-2xl font-display " + (/*childrenVisible*/ ctx[1] ? "font-semibold" : ""))) {
    				attr_dev(h4, "class", h4_class_value);
    			}

    			if (!current || dirty & /*childrenVisible*/ 2 && p_class_value !== (p_class_value = "text-gray-400 icon-arrow-down rotate my-1 " + (/*childrenVisible*/ ctx[1]
    			? "rotate-180 mb-4"
    			: "rotate-0") + " svelte-1blatth")) {
    				attr_dev(p, "class", p_class_value);
    			}

    			if (/*childrenVisible*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*childrenVisible*/ 2 && button_class_value !== (button_class_value = "bg-white transition-shadow transition-width transition-250 flex items-stretch\r\n  shadow hover:shadow-lg focus:shadow-lg rounded-lg hover:cursor-pointer mx-1 my-4 md:mx-4 p-5 flex flex-col\r\n  items-center text-center select-none " + (/*childrenVisible*/ ctx[1]
    			? "md:w-9/12"
    			: "w-full md:w-4/12 lg:w-3/12") + " " + (/*childrenVisible*/ ctx[1] ? "shadow-lg" : "") + "\r\n  ")) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (if_block) if_block.d();
    			if (detaching && div1_transition) div1_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { skill } = $$props;
    	let childrenVisible = false;

    	function toggleChildren() {
    		$$invalidate(1, childrenVisible = !childrenVisible);
    	}

    	const writable_props = ["skill"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<SkillList> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("skill" in $$props) $$invalidate(0, skill = $$props.skill);
    	};

    	$$self.$capture_state = () => ({
    		skill,
    		slide,
    		fade,
    		fly,
    		flip,
    		childrenVisible,
    		toggleChildren
    	});

    	$$self.$inject_state = $$props => {
    		if ("skill" in $$props) $$invalidate(0, skill = $$props.skill);
    		if ("childrenVisible" in $$props) $$invalidate(1, childrenVisible = $$props.childrenVisible);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [skill, childrenVisible, toggleChildren];
    }

    class SkillList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { skill: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SkillList",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*skill*/ ctx[0] === undefined && !("skill" in props)) {
    			console.warn("<SkillList> was created without expected prop 'skill'");
    		}
    	}

    	get skill() {
    		throw new Error("<SkillList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set skill(value) {
    		throw new Error("<SkillList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ProjectCard.svelte generated by Svelte v3.19.1 */

    const file$4 = "src\\components\\ProjectCard.svelte";

    function create_fragment$4(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let h4;
    	let raw0_value = /*project*/ ctx[0].name + "";
    	let t1;
    	let h6;
    	let t2_value = /*project*/ ctx[0].yearStart + "";
    	let t2;
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let p;
    	let raw1_value = /*project*/ ctx[0].description + "";
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			t0 = space();
    			h4 = element("h4");
    			t1 = space();
    			h6 = element("h6");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(/*yearSep*/ ctx[3]);
    			t5 = space();
    			t6 = text(/*yearEnd*/ ctx[2]);
    			t7 = space();
    			p = element("p");
    			attr_dev(img, "class", "h-16");
    			if (img.src !== (img_src_value = /*project*/ ctx[0].heroImage)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*project*/ ctx[0].name);
    			attr_dev(img, "aria-hidden", "true");
    			add_location(img, file$4, 36, 4, 1518);
    			attr_dev(h4, "class", "text-xl font-semibold leading-tight font-display");
    			add_location(h4, file$4, 38, 4, 1608);
    			attr_dev(h6, "class", "text-gray-600 text-sm font-semibold");
    			add_location(h6, file$4, 41, 4, 1714);
    			attr_dev(p, "class", "text-sm mt-3 text-white text-gray-600");
    			add_location(p, file$4, 43, 4, 1814);
    			attr_dev(button, "aria-describedby", "Project");
    			attr_dev(button, "class", "w-8/12 md:w-4/12 lg:w-3/12 bg-white shadow focus:shadow-lg hover:shadow-lg rounded-lg\r\n  hover:cursor-pointer m-4 p-5 flex flex-col items-center text-center transition-shadow transition-250 select-none");
    			add_location(button, file$4, 31, 0, 1206);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);
    			append_dev(button, t0);
    			append_dev(button, h4);
    			h4.innerHTML = raw0_value;
    			append_dev(button, t1);
    			append_dev(button, h6);
    			append_dev(h6, t2);
    			append_dev(h6, t3);
    			append_dev(h6, t4);
    			append_dev(h6, t5);
    			append_dev(h6, t6);
    			append_dev(button, t7);
    			append_dev(button, p);
    			p.innerHTML = raw1_value;
    			/*button_binding*/ ctx[6](button);
    			dispose = listen_dev(button, "click", /*showGallery*/ ctx[4], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*project*/ 1 && img.src !== (img_src_value = /*project*/ ctx[0].heroImage)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*project*/ 1 && img_alt_value !== (img_alt_value = /*project*/ ctx[0].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*project*/ 1 && raw0_value !== (raw0_value = /*project*/ ctx[0].name + "")) h4.innerHTML = raw0_value;			if (dirty & /*project*/ 1 && t2_value !== (t2_value = /*project*/ ctx[0].yearStart + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*project*/ 1 && raw1_value !== (raw1_value = /*project*/ ctx[0].description + "")) p.innerHTML = raw1_value;		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			/*button_binding*/ ctx[6](null);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { project } = $$props;
    	let currentYear = new Date().getFullYear();
    	let yearEnd = project.yearEnd == null ? currentYear : "";
    	let yearSep = project.yearStart !== project.yearEnd ? "-" : "";
    	let projectContainer;

    	function showGallery() {
    		lightGallery(projectContainer, {
    			dynamic: true,
    			hideControlOnEnd: true,
    			preload: 2,
    			download: false,
    			dynamicEl: project.images,
    			mode: "lg-slide"
    		});
    	}

    	const writable_props = ["project"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ProjectCard> was created with unknown prop '${key}'`);
    	});

    	function button_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, projectContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("project" in $$props) $$invalidate(0, project = $$props.project);
    	};

    	$$self.$capture_state = () => ({
    		project,
    		currentYear,
    		yearEnd,
    		yearSep,
    		projectContainer,
    		showGallery,
    		Date,
    		lightGallery
    	});

    	$$self.$inject_state = $$props => {
    		if ("project" in $$props) $$invalidate(0, project = $$props.project);
    		if ("currentYear" in $$props) currentYear = $$props.currentYear;
    		if ("yearEnd" in $$props) $$invalidate(2, yearEnd = $$props.yearEnd);
    		if ("yearSep" in $$props) $$invalidate(3, yearSep = $$props.yearSep);
    		if ("projectContainer" in $$props) $$invalidate(1, projectContainer = $$props.projectContainer);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		project,
    		projectContainer,
    		yearEnd,
    		yearSep,
    		showGallery,
    		currentYear,
    		button_binding
    	];
    }

    class ProjectCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { project: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProjectCard",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*project*/ ctx[0] === undefined && !("project" in props)) {
    			console.warn("<ProjectCard> was created without expected prop 'project'");
    		}
    	}

    	get project() {
    		throw new Error("<ProjectCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set project(value) {
    		throw new Error("<ProjectCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ContactButton.svelte generated by Svelte v3.19.1 */

    const file$5 = "src\\components\\ContactButton.svelte";

    function create_fragment$5(ctx) {
    	let a;
    	let i;
    	let i_class_value;
    	let t;
    	let div;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[2], null);

    	const block = {
    		c: function create() {
    			a = element("a");
    			i = element("i");
    			t = space();
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(i, "class", i_class_value = "" + (/*icon*/ ctx[1] + " mr-1 xs:mr-0 inline-block"));
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$5, 13, 2, 637);
    			attr_dev(div, "class", "xs:hidden");
    			add_location(div, file$5, 14, 2, 706);
    			attr_dev(a, "href", /*href*/ ctx[0]);
    			attr_dev(a, "class", "mx-2 p-3 py-2 bg-purple-100 text-purple-700  rounded inline-flex items-baseline\r\n  hover:bg-purple-700 hover:text-white xs:text-lg transition-bg transition-color transition-500");
    			add_location(a, file$5, 9, 0, 432);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, i);
    			append_dev(a, t);
    			append_dev(a, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*icon*/ 2 && i_class_value !== (i_class_value = "" + (/*icon*/ ctx[1] + " mr-1 xs:mr-0 inline-block"))) {
    				attr_dev(i, "class", i_class_value);
    			}

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 4) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[2], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[2], dirty, null));
    			}

    			if (!current || dirty & /*href*/ 1) {
    				attr_dev(a, "href", /*href*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { href } = $$props;
    	let { icon } = $$props;
    	const writable_props = ["href", "icon"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ContactButton> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("icon" in $$props) $$invalidate(1, icon = $$props.icon);
    		if ("$$scope" in $$props) $$invalidate(2, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ href, icon });

    	$$self.$inject_state = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("icon" in $$props) $$invalidate(1, icon = $$props.icon);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [href, icon, $$scope, $$slots];
    }

    class ContactButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { href: 0, icon: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ContactButton",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*href*/ ctx[0] === undefined && !("href" in props)) {
    			console.warn("<ContactButton> was created without expected prop 'href'");
    		}

    		if (/*icon*/ ctx[1] === undefined && !("icon" in props)) {
    			console.warn("<ContactButton> was created without expected prop 'icon'");
    		}
    	}

    	get href() {
    		throw new Error("<ContactButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<ContactButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get icon() {
    		throw new Error("<ContactButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set icon(value) {
    		throw new Error("<ContactButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.19.1 */
    const file$6 = "src\\App.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (59:4) {:catch error}
    function create_catch_block_1(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*error*/ ctx[4].message + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Something went wrong while loading skill list: ");
    			t1 = text(t1_value);
    			add_location(p, file$6, 59, 6, 6473);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(59:4) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (55:4) {:then value}
    function create_then_block_1(ctx) {
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_1_anchor;
    	let current;
    	let each_value_1 = /*value*/ ctx[3];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*index*/ ctx[10];
    	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*skills*/ 1) {
    				const each_value_1 = /*value*/ ctx[3];
    				validate_each_argument(each_value_1);
    				group_outros();
    				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_1$1, each_1_anchor, get_each_context_1$1);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(55:4) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (56:6) {#each value as skill, index (index)}
    function create_each_block_1$1(key_1, ctx) {
    	let first;
    	let current;

    	const skilllist = new SkillList({
    			props: { skill: /*skill*/ ctx[8] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(skilllist.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(skilllist, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(skilllist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(skilllist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(skilllist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(56:6) {#each value as skill, index (index)}",
    		ctx
    	});

    	return block;
    }

    // (53:19)         <p class="has-text-centered">⏳</p>      {:then value}
    function create_pending_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "⏳";
    			attr_dev(p, "class", "has-text-centered");
    			add_location(p, file$6, 53, 6, 6301);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(53:19)         <p class=\\\"has-text-centered\\\">⏳</p>      {:then value}",
    		ctx
    	});

    	return block;
    }

    // (78:2) {:catch error}
    function create_catch_block(ctx) {
    	let p;
    	let t0;
    	let t1_value = /*error*/ ctx[4].message + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("Something went wrong while loading project list: ");
    			t1 = text(t1_value);
    			add_location(p, file$6, 78, 4, 6945);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(78:2) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (74:2) {:then value}
    function create_then_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*value*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*projects*/ 2) {
    				each_value = /*value*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(74:2) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (75:4) {#each value as project}
    function create_each_block$1(ctx) {
    	let current;

    	const projectcard = new ProjectCard({
    			props: { project: /*project*/ ctx[5] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(projectcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(projectcard, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(projectcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(projectcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(projectcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(75:4) {#each value as project}",
    		ctx
    	});

    	return block;
    }

    // (72:19)       <p class="has-text-centered">⏳</p>    {:then value}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "⏳";
    			attr_dev(p, "class", "has-text-centered");
    			add_location(p, file$6, 72, 4, 6794);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(72:19)       <p class=\\\"has-text-centered\\\">⏳</p>    {:then value}",
    		ctx
    	});

    	return block;
    }

    // (98:4) <ContactButton href="mailto:goran.alkovic@hotmail.com" icon="icon-envelope">
    function create_default_slot_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("E-mail");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(98:4) <ContactButton href=\\\"mailto:goran.alkovic@hotmail.com\\\" icon=\\\"icon-envelope\\\">",
    		ctx
    	});

    	return block;
    }

    // (101:4) <ContactButton        href="https://github.com/goranalkovic"        icon="icon-social-github">
    function create_default_slot_1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("GitHub");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(101:4) <ContactButton        href=\\\"https://github.com/goranalkovic\\\"        icon=\\\"icon-social-github\\\">",
    		ctx
    	});

    	return block;
    }

    // (106:4) <ContactButton href="tel:+385976480800" icon="icon-phone">
    function create_default_slot(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Mobile");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(106:4) <ContactButton href=\\\"tel:+385976480800\\\" icon=\\\"icon-phone\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let t0;
    	let div1;
    	let h10;
    	let t2;
    	let div0;
    	let promise;
    	let t3;
    	let div3;
    	let h11;
    	let t5;
    	let div2;
    	let promise_1;
    	let t6;
    	let p0;
    	let t8;
    	let p1;
    	let t10;
    	let footer;
    	let h4;
    	let t12;
    	let div4;
    	let t13;
    	let t14;
    	let current;
    	const hero = new Hero({ $$inline: true });

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 3,
    		error: 4,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*skills*/ ctx[0], info);

    	let info_1 = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 3,
    		error: 4,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*projects*/ ctx[1], info_1);

    	const contactbutton0 = new ContactButton({
    			props: {
    				href: "mailto:goran.alkovic@hotmail.com",
    				icon: "icon-envelope",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const contactbutton1 = new ContactButton({
    			props: {
    				href: "https://github.com/goranalkovic",
    				icon: "icon-social-github",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const contactbutton2 = new ContactButton({
    			props: {
    				href: "tel:+385976480800",
    				icon: "icon-phone",
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(hero.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			h10 = element("h1");
    			h10.textContent = "What I do";
    			t2 = space();
    			div0 = element("div");
    			info.block.c();
    			t3 = space();
    			div3 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Projects";
    			t5 = space();
    			div2 = element("div");
    			info_1.block.c();
    			t6 = space();
    			p0 = element("p");
    			p0.textContent = "© Goran Alković, 2019";
    			t8 = space();
    			p1 = element("p");
    			p1.textContent = "Made with Svelte and Tailwind.css, hosted on GitHub";
    			t10 = space();
    			footer = element("footer");
    			h4 = element("h4");
    			h4.textContent = "Get in touch";
    			t12 = space();
    			div4 = element("div");
    			create_component(contactbutton0.$$.fragment);
    			t13 = space();
    			create_component(contactbutton1.$$.fragment);
    			t14 = space();
    			create_component(contactbutton2.$$.fragment);
    			attr_dev(h10, "class", "text-3xl text-center px-4 py-2 text-purple-600 select-none");
    			add_location(h10, file$6, 47, 2, 6103);
    			attr_dev(div0, "class", "flex w-full flex-wrap justify-center max-w-6xl mx-auto");
    			add_location(div0, file$6, 51, 2, 6204);
    			attr_dev(div1, "class", "p-8 pb-0");
    			add_location(div1, file$6, 46, 0, 6077);
    			attr_dev(h11, "class", "text-3xl text-center px-4 py-2 text-purple-600 select-none");
    			add_location(h11, file$6, 65, 2, 6599);
    			attr_dev(div2, "class", "flex flex-wrap w-full justify-center max-w-6xl mx-auto");
    			add_location(div2, file$6, 69, 0, 6697);
    			attr_dev(div3, "class", "p-8");
    			add_location(div3, file$6, 64, 0, 6578);
    			attr_dev(p0, "class", "text-center text-gray-500 pt-4 select-none");
    			add_location(p0, file$6, 84, 0, 7050);
    			attr_dev(p1, "class", "text-center text-gray-200 pb-4 select-none");
    			add_location(p1, file$6, 85, 0, 7136);
    			attr_dev(h4, "class", " sm-max:mb-2 sm-max:mr-0 mb-0 xs:mr-1 mr-2 text-lg font-semibold");
    			add_location(h4, file$6, 93, 2, 7458);
    			attr_dev(div4, "class", "flex");
    			add_location(div4, file$6, 96, 2, 7566);
    			attr_dev(footer, "class", "flex flex-row sm-max:flex-col bg-white p-5 items-center\r\n  md:items-baseline justify-center sticky bottom-0 shadow-2xl bg-texture-footer\r\n  rounded-tr-lg rounded-tl-lg select-none svelte-1eekzhd");
    			add_location(footer, file$6, 89, 0, 7255);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(hero, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h10);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			info.block.m(div0, info.anchor = null);
    			info.mount = () => div0;
    			info.anchor = null;
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h11);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			info_1.block.m(div2, info_1.anchor = null);
    			info_1.mount = () => div2;
    			info_1.anchor = null;
    			insert_dev(target, t6, anchor);
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, p1, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, footer, anchor);
    			append_dev(footer, h4);
    			append_dev(footer, t12);
    			append_dev(footer, div4);
    			mount_component(contactbutton0, div4, null);
    			append_dev(div4, t13);
    			mount_component(contactbutton1, div4, null);
    			append_dev(div4, t14);
    			mount_component(contactbutton2, div4, null);
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[3] = info.resolved;
    				info.block.p(child_ctx, dirty);
    			}

    			{
    				const child_ctx = ctx.slice();
    				child_ctx[3] = info_1.resolved;
    				info_1.block.p(child_ctx, dirty);
    			}

    			const contactbutton0_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				contactbutton0_changes.$$scope = { dirty, ctx };
    			}

    			contactbutton0.$set(contactbutton0_changes);
    			const contactbutton1_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				contactbutton1_changes.$$scope = { dirty, ctx };
    			}

    			contactbutton1.$set(contactbutton1_changes);
    			const contactbutton2_changes = {};

    			if (dirty & /*$$scope*/ 2048) {
    				contactbutton2_changes.$$scope = { dirty, ctx };
    			}

    			contactbutton2.$set(contactbutton2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hero.$$.fragment, local);
    			transition_in(info.block);
    			transition_in(info_1.block);
    			transition_in(contactbutton0.$$.fragment, local);
    			transition_in(contactbutton1.$$.fragment, local);
    			transition_in(contactbutton2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hero.$$.fragment, local);

    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			for (let i = 0; i < 3; i += 1) {
    				const block = info_1.blocks[i];
    				transition_out(block);
    			}

    			transition_out(contactbutton0.$$.fragment, local);
    			transition_out(contactbutton1.$$.fragment, local);
    			transition_out(contactbutton2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(hero, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			info.block.d();
    			info.token = null;
    			info = null;
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div3);
    			info_1.block.d();
    			info_1.token = null;
    			info_1 = null;
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(footer);
    			destroy_component(contactbutton0);
    			destroy_component(contactbutton1);
    			destroy_component(contactbutton2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function sleep(ms) {
    	return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function loadSkills() {
    	// await sleep(2000);
    	let response = await fetch("files/cv.json");

    	return response.json();
    }

    async function loadProjects() {
    	let response = await fetch("files/projects.json");
    	return response.json();
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let skills = loadSkills();
    	let projects = loadProjects();
    	let projectContainer;

    	$$self.$capture_state = () => ({
    		Hero,
    		SectionHeader,
    		SkillList,
    		ProjectCard,
    		ContactButton,
    		flip,
    		slide,
    		sleep,
    		loadSkills,
    		loadProjects,
    		skills,
    		projects,
    		projectContainer,
    		Promise,
    		setTimeout,
    		fetch
    	});

    	$$self.$inject_state = $$props => {
    		if ("skills" in $$props) $$invalidate(0, skills = $$props.skills);
    		if ("projects" in $$props) $$invalidate(1, projects = $$props.projects);
    		if ("projectContainer" in $$props) projectContainer = $$props.projectContainer;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [skills, projects];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {
        name: 'world'
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
