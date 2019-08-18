
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
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
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
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
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
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
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
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
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
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
            info.resolved = key && { [key]: value };
            const child_ctx = assign(assign({}, info.ctx), info.resolved);
            const block = type && (info.current = type)(child_ctx);
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
                flush();
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
        }
        if (is_promise(promise)) {
            promise.then(value => {
                update(info.then, 1, info.value, value);
            }, error => {
                update(info.catch, 2, info.error, error);
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
            info.resolved = { [info.value]: promise };
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
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
                block.p(changed, child_ctx);
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
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
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
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
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
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
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

    /* src\components\BrandLogo.svelte generated by Svelte v3.7.1 */

    const file = "src\\components\\BrandLogo.svelte";

    function create_fragment(ctx) {
    	var img, img_class_value, dispose;

    	return {
    		c: function create() {
    			img = element("img");
    			attr(img, "alt", "Goran Alković");
    			attr(img, "class", img_class_value = "h-20 rounded shadow-lg cursor-pointer " + ctx.animClass + " " + ctx.customClass);
    			attr(img, "src", ctx.src);
    			add_location(img, file, 69, 0, 1380);
    			dispose = listen(img, "click", ctx.swapLogo);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, img, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.animClass || changed.customClass) && img_class_value !== (img_class_value = "h-20 rounded shadow-lg cursor-pointer " + ctx.animClass + " " + ctx.customClass)) {
    				attr(img, "class", img_class_value);
    			}

    			if (changed.src) {
    				attr(img, "src", ctx.src);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(img);
    			}

    			dispose();
    		}
    	};
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
        $$invalidate('src', src = value);
      });

      logoSrc.set(getNewImg());
      // src = getNewImg();

      let animClass;

      const unsubscribe2 = animationClass.subscribe(value => {
        $$invalidate('animClass', animClass = value);
      });

      function swapLogo() {
        // Check if it's ok to swap
        if (!canSwap) return;

        // Disallow swapping
        canSwap = false;

        // Start animation
        animationClass.set('animated jello');

        // Swap logo
        setTimeout(() => {
          logoSrc.set(getNewImg());
        }, 450);

        // Remove animation
        setTimeout(() => {
          animationClass.set('');
          canSwap = true;
        }, 850);
      }

      function getNewImg() {
        let currentVersion = src.slice(-5, -4);

        let newVersion = getRandomInt(1, 9, currentVersion);

        while (newVersion === currentVersion) {
          newVersion = getRandomInt(1, 9);
        }

        return `img/logo/logo-v${newVersion}.svg`;
      }

    	const writable_props = ['customClass', 'small'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<BrandLogo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('customClass' in $$props) $$invalidate('customClass', customClass = $$props.customClass);
    		if ('small' in $$props) $$invalidate('small', small = $$props.small);
    	};

    	$$self.$$.update = ($$dirty = { small: 1 }) => {
    		if ($$dirty.small) ;
    	};

    	return {
    		customClass,
    		small,
    		src,
    		animClass,
    		swapLogo
    	};
    }

    class BrandLogo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["customClass", "small"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.customClass === undefined && !('customClass' in props)) {
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

    /* src\components\Hero.svelte generated by Svelte v3.7.1 */

    const file$1 = "src\\components\\Hero.svelte";

    function create_fragment$1(ctx) {
    	var section, div1, div0, h1, t1, p0, t3, p1, t4, br0, t5, br1, t6, t7, t8, a, i, t9, span, current;

    	var brandlogo = new BrandLogo({
    		props: { customClass: "-mb-6 md:-mb-10 md:-mr-16" },
    		$$inline: true
    	});

    	return {
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
    			brandlogo.$$.fragment.c();
    			t8 = space();
    			a = element("a");
    			i = element("i");
    			t9 = space();
    			span = element("span");
    			span.textContent = "Get the CV";
    			attr(h1, "class", "mt-6 md:mt-0 font-semibold font-display text-2xl text-purple-700\r\n        leading-none");
    			add_location(h1, file$1, 19, 6, 1291);
    			attr(p0, "class", "font-display text-gray-800");
    			add_location(p0, file$1, 24, 6, 1443);
    			add_location(br0, file$1, 27, 8, 1635);
    			add_location(br1, file$1, 30, 8, 1748);
    			attr(p1, "class", "mt-4 md:mt-2 text-sm text-gray-700 ");
    			add_location(p1, file$1, 25, 6, 1515);
    			attr(div0, "class", "text-center md:text-left p-4 bg-white rounded-lg shadow-lg\r\n      leading-relaxed");
    			add_location(div0, file$1, 16, 4, 1181);
    			attr(div1, "class", "flex flex-col-reverse items-center md:items-end w-10/12 md:w-auto");
    			add_location(div1, file$1, 13, 2, 1089);
    			attr(i, "class", "icon-doc mr-1");
    			add_location(i, file$1, 40, 2, 2271);
    			attr(span, "class", "inline-block");
    			add_location(span, file$1, 41, 2, 2304);
    			attr(a, "href", "files/Goran_Alkovic_CV.pdf");
    			attr(a, "class", "mt-6 -mb-4 bg-purple-200 border border-purple-300 py-1 px-2 text-purple-500 flex items-baseline justify-center rounded hover:border-purple-700 hover:text-purple-100 hover:bg-purple-700 select-none transition-border transition-bg transition-color transition-500");
    			add_location(a, file$1, 39, 2, 1961);
    			attr(section, "class", "bg-purple-200 bg-texture py-8 md:py-10 flex flex-col items-center justify-center select-none svelte-vzfb0w");
    			add_location(section, file$1, 10, 0, 970);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, section, anchor);
    			append(section, div1);
    			append(div1, div0);
    			append(div0, h1);
    			append(div0, t1);
    			append(div0, p0);
    			append(div0, t3);
    			append(div0, p1);
    			append(p1, t4);
    			append(p1, br0);
    			append(p1, t5);
    			append(p1, br1);
    			append(p1, t6);
    			append(div1, t7);
    			mount_component(brandlogo, div1, null);
    			append(section, t8);
    			append(section, a);
    			append(a, i);
    			append(a, t9);
    			append(a, span);
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
    			if (detaching) {
    				detach(section);
    			}

    			destroy_component(brandlogo);
    		}
    	};
    }

    class Hero extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, []);
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400 }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            css: t => `opacity: ${t * o}`
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
        const dx = animation.from.left - animation.to.left;
        const dy = animation.from.top - animation.to.top;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = d => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src\components\SkillList.svelte generated by Svelte v3.7.1 */

    const file$2 = "src\\components\\SkillList.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.itm = list[i];
    	child_ctx.ind = i;
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (53:4) {#if childrenVisible}
    function create_if_block(ctx) {
    	var each_1_anchor, current;

    	var each_value = ctx.skill.items;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.skill) {
    				each_value = ctx.skill.items;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (70:14) {#if itm.subtitle != null}
    function create_if_block_1(ctx) {
    	var br, t, span, raw_value = ctx.itm.subtitle;

    	return {
    		c: function create() {
    			br = element("br");
    			t = space();
    			span = element("span");
    			add_location(br, file$2, 70, 16, 3213);
    			attr(span, "class", "");
    			add_location(span, file$2, 71, 16, 3237);
    		},

    		m: function mount(target, anchor) {
    			insert(target, br, anchor);
    			insert(target, t, anchor);
    			insert(target, span, anchor);
    			span.innerHTML = raw_value;
    		},

    		p: function update(changed, ctx) {
    			if ((changed.skill) && raw_value !== (raw_value = ctx.itm.subtitle)) {
    				span.innerHTML = raw_value;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(br);
    				detach(t);
    				detach(span);
    			}
    		}
    	};
    }

    // (60:10) {#each item.items as itm, ind (ind)}
    function create_each_block_1(key_1, ctx) {
    	var li, b, raw0_value = ctx.itm.name, t0, t1, br, t2, span, raw1_value = ctx.itm.level, li_transition, rect, stop_animation = noop, current;

    	var if_block = (ctx.itm.subtitle != null) && create_if_block_1(ctx);

    	return {
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
    			attr(b, "class", "");
    			add_location(b, file$2, 65, 14, 3085);
    			add_location(br, file$2, 76, 14, 3356);
    			attr(span, "class", "text-xs font-semibold text-gray-600 uppercase\r\n                tracking-widest");
    			add_location(span, file$2, 77, 14, 3378);
    			attr(li, "class", "m-2 md:flex-1");
    			add_location(li, file$2, 60, 12, 2944);
    			this.first = li;
    		},

    		m: function mount(target, anchor) {
    			insert(target, li, anchor);
    			append(li, b);
    			b.innerHTML = raw0_value;
    			append(li, t0);
    			if (if_block) if_block.m(li, null);
    			append(li, t1);
    			append(li, br);
    			append(li, t2);
    			append(li, span);
    			span.innerHTML = raw1_value;
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.skill) && raw0_value !== (raw0_value = ctx.itm.name)) {
    				b.innerHTML = raw0_value;
    			}

    			if (ctx.itm.subtitle != null) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(li, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if ((!current || changed.skill) && raw1_value !== (raw1_value = ctx.itm.level)) {
    				span.innerHTML = raw1_value;
    			}
    		},

    		r: function measure_1() {
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
    				if (!li_transition) li_transition = create_bidirectional_transition(li, slide, { delay: 50 * ctx.ind }, true);
    				li_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!li_transition) li_transition = create_bidirectional_transition(li, slide, { delay: 50 * ctx.ind }, false);
    			li_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(li);
    			}

    			if (if_block) if_block.d();

    			if (detaching) {
    				if (li_transition) li_transition.end();
    			}
    		}
    	};
    }

    // (54:6) {#each skill.items as item, i}
    function create_each_block(ctx) {
    	var ul, li, b, t0_value = ctx.item.section, t0, b_class_value, li_transition, t1, each_blocks = [], each_1_lookup = new Map(), t2, ul_transition, current;

    	var each_value_1 = ctx.item.items;

    	const get_key = ctx => ctx.ind;

    	for (var i_1 = 0; i_1 < each_value_1.length; i_1 += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i_1);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i_1] = create_each_block_1(key, child_ctx));
    	}

    	return {
    		c: function create() {
    			ul = element("ul");
    			li = element("li");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();

    			for (i_1 = 0; i_1 < each_blocks.length; i_1 += 1) each_blocks[i_1].c();

    			t2 = space();
    			attr(b, "class", b_class_value = "" + ctx.skill.iconColor + " text-xl" + " svelte-1blatth");
    			add_location(b, file$2, 56, 12, 2808);
    			add_location(li, file$2, 55, 10, 2773);
    			attr(ul, "class", "md:ml-10 flex-grow");
    			add_location(ul, file$2, 54, 8, 2714);
    		},

    		m: function mount(target, anchor) {
    			insert(target, ul, anchor);
    			append(ul, li);
    			append(li, b);
    			append(b, t0);
    			append(ul, t1);

    			for (i_1 = 0; i_1 < each_blocks.length; i_1 += 1) each_blocks[i_1].m(ul, null);

    			append(ul, t2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.skill) && t0_value !== (t0_value = ctx.item.section)) {
    				set_data(t0, t0_value);
    			}

    			if ((!current || changed.skill) && b_class_value !== (b_class_value = "" + ctx.skill.iconColor + " text-xl" + " svelte-1blatth")) {
    				attr(b, "class", b_class_value);
    			}

    			const each_value_1 = ctx.item.items;

    			group_outros();
    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) each_blocks[i_1].r();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value_1, each_1_lookup, ul, fix_and_outro_and_destroy_block, create_each_block_1, t2, get_each_context_1);
    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) each_blocks[i_1].a();
    			check_outros();
    		},

    		i: function intro(local) {
    			if (current) return;
    			add_render_callback(() => {
    				if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, true);
    				li_transition.run(1);
    			});

    			for (var i_1 = 0; i_1 < each_value_1.length; i_1 += 1) transition_in(each_blocks[i_1]);

    			add_render_callback(() => {
    				if (!ul_transition) ul_transition = create_bidirectional_transition(ul, fade, {}, true);
    				ul_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			if (!li_transition) li_transition = create_bidirectional_transition(li, slide, {}, false);
    			li_transition.run(0);

    			for (i_1 = 0; i_1 < each_blocks.length; i_1 += 1) transition_out(each_blocks[i_1]);

    			if (!ul_transition) ul_transition = create_bidirectional_transition(ul, fade, {}, false);
    			ul_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(ul);
    				if (li_transition) li_transition.end();
    			}

    			for (i_1 = 0; i_1 < each_blocks.length; i_1 += 1) each_blocks[i_1].d();

    			if (detaching) {
    				if (ul_transition) ul_transition.end();
    			}
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	var button, div0, h4, span0, i, i_class_value, span0_class_value, t0, span1, t1_value = ctx.skill.name, t1, h4_class_value, t2, p, p_class_value, t3, div1, div1_transition, button_class_value, current, dispose;

    	var if_block = (ctx.childrenVisible) && create_if_block(ctx);

    	return {
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
    			attr(i, "class", i_class_value = "" + null_to_empty(ctx.skill.icon) + " svelte-1blatth");
    			add_location(i, file$2, 41, 6, 2278);
    			attr(span0, "class", span0_class_value = "icon " + ctx.skill.iconColor + " svelte-1blatth");
    			attr(span0, "aria-hidden", "true");
    			add_location(span0, file$2, 40, 4, 2214);
    			attr(span1, "class", "ml-2");
    			add_location(span1, file$2, 43, 4, 2321);
    			attr(h4, "class", h4_class_value = "text-2xl font-display " + (ctx.childrenVisible ? 'font-semibold' : '') + " svelte-1blatth");
    			add_location(h4, file$2, 39, 2, 2133);
    			attr(p, "aria-roledescription", "See more");
    			attr(p, "class", p_class_value = "text-gray-400 icon-arrow-down rotate my-1 " + (ctx.childrenVisible ? 'rotate-180 mb-4' : 'rotate-0') + " svelte-1blatth");
    			add_location(p, file$2, 45, 2, 2372);
    			attr(div0, "class", "flex flex-col md:flex-row md:justify-between items-center w-full");
    			add_location(div0, file$2, 38, 2, 2051);
    			attr(div1, "class", "flex text-center md:text-left justify-center w-full flex-wrap flex-1");
    			add_location(div1, file$2, 49, 2, 2531);
    			attr(button, "aria-describedby", "Skill");
    			attr(button, "class", button_class_value = "bg-white transition-shadow transition-width transition-250 flex items-stretch\r\n  shadow hover:shadow-lg focus:shadow-lg rounded-lg hover:cursor-pointer mx-1 my-4 md:mx-4 p-5 flex flex-col\r\n  items-center text-center select-none " + (ctx.childrenVisible ? 'md:w-9/12' : 'w-full md:w-4/12 lg:w-3/12') + " " + (ctx.childrenVisible ? 'shadow-lg' : '') + "\r\n  " + " svelte-1blatth");
    			add_location(button, file$2, 31, 0, 1640);
    			dispose = listen(button, "click", ctx.toggleChildren);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			append(button, div0);
    			append(div0, h4);
    			append(h4, span0);
    			append(span0, i);
    			append(h4, t0);
    			append(h4, span1);
    			append(span1, t1);
    			append(div0, t2);
    			append(div0, p);
    			append(button, t3);
    			append(button, div1);
    			if (if_block) if_block.m(div1, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.skill) && i_class_value !== (i_class_value = "" + null_to_empty(ctx.skill.icon) + " svelte-1blatth")) {
    				attr(i, "class", i_class_value);
    			}

    			if ((!current || changed.skill) && span0_class_value !== (span0_class_value = "icon " + ctx.skill.iconColor + " svelte-1blatth")) {
    				attr(span0, "class", span0_class_value);
    			}

    			if ((!current || changed.skill) && t1_value !== (t1_value = ctx.skill.name)) {
    				set_data(t1, t1_value);
    			}

    			if ((!current || changed.childrenVisible) && h4_class_value !== (h4_class_value = "text-2xl font-display " + (ctx.childrenVisible ? 'font-semibold' : '') + " svelte-1blatth")) {
    				attr(h4, "class", h4_class_value);
    			}

    			if ((!current || changed.childrenVisible) && p_class_value !== (p_class_value = "text-gray-400 icon-arrow-down rotate my-1 " + (ctx.childrenVisible ? 'rotate-180 mb-4' : 'rotate-0') + " svelte-1blatth")) {
    				attr(p, "class", p_class_value);
    			}

    			if (ctx.childrenVisible) {
    				if (if_block) {
    					if_block.p(changed, ctx);
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

    			if ((!current || changed.childrenVisible) && button_class_value !== (button_class_value = "bg-white transition-shadow transition-width transition-250 flex items-stretch\r\n  shadow hover:shadow-lg focus:shadow-lg rounded-lg hover:cursor-pointer mx-1 my-4 md:mx-4 p-5 flex flex-col\r\n  items-center text-center select-none " + (ctx.childrenVisible ? 'md:w-9/12' : 'w-full md:w-4/12 lg:w-3/12') + " " + (ctx.childrenVisible ? 'shadow-lg' : '') + "\r\n  " + " svelte-1blatth")) {
    				attr(button, "class", button_class_value);
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
    			if (detaching) {
    				detach(button);
    			}

    			if (if_block) if_block.d();

    			if (detaching) {
    				if (div1_transition) div1_transition.end();
    			}

    			dispose();
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { skill } = $$props;

      let childrenVisible = false;

      function toggleChildren() {
        $$invalidate('childrenVisible', childrenVisible = !childrenVisible);
      }

    	const writable_props = ['skill'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<SkillList> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('skill' in $$props) $$invalidate('skill', skill = $$props.skill);
    	};

    	return { skill, childrenVisible, toggleChildren };
    }

    class SkillList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, ["skill"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.skill === undefined && !('skill' in props)) {
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

    /* src\components\ProjectCard.svelte generated by Svelte v3.7.1 */

    const file$3 = "src\\components\\ProjectCard.svelte";

    function create_fragment$3(ctx) {
    	var button, img, img_src_value, img_alt_value, t0, h4, raw0_value = ctx.project.name, t1, h6, t2_value = ctx.project.yearStart, t2, t3, t4, t5, t6, t7, p, raw1_value = ctx.project.description, dispose;

    	return {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			t0 = space();
    			h4 = element("h4");
    			t1 = space();
    			h6 = element("h6");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(ctx.yearSep);
    			t5 = space();
    			t6 = text(ctx.yearEnd);
    			t7 = space();
    			p = element("p");
    			attr(img, "class", "h-16");
    			attr(img, "src", img_src_value = ctx.project.heroImage);
    			attr(img, "alt", img_alt_value = ctx.project.name);
    			attr(img, "aria-hidden", "true");
    			add_location(img, file$3, 36, 4, 1518);
    			attr(h4, "class", "text-xl font-semibold leading-tight font-display");
    			add_location(h4, file$3, 38, 4, 1608);
    			attr(h6, "class", "text-gray-600 text-sm font-semibold");
    			add_location(h6, file$3, 41, 4, 1714);
    			attr(p, "class", "text-sm mt-3 text-white text-gray-600");
    			add_location(p, file$3, 43, 4, 1814);
    			attr(button, "aria-describedby", "Project");
    			attr(button, "class", "w-8/12 md:w-4/12 lg:w-3/12 bg-white shadow focus:shadow-lg hover:shadow-lg rounded-lg\r\n  hover:cursor-pointer m-4 p-5 flex flex-col items-center text-center transition-shadow transition-250 select-none");
    			add_location(button, file$3, 31, 0, 1206);
    			dispose = listen(button, "click", ctx.showGallery);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, button, anchor);
    			append(button, img);
    			append(button, t0);
    			append(button, h4);
    			h4.innerHTML = raw0_value;
    			append(button, t1);
    			append(button, h6);
    			append(h6, t2);
    			append(h6, t3);
    			append(h6, t4);
    			append(h6, t5);
    			append(h6, t6);
    			append(button, t7);
    			append(button, p);
    			p.innerHTML = raw1_value;
    			ctx.button_binding(button);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.project) && img_src_value !== (img_src_value = ctx.project.heroImage)) {
    				attr(img, "src", img_src_value);
    			}

    			if ((changed.project) && img_alt_value !== (img_alt_value = ctx.project.name)) {
    				attr(img, "alt", img_alt_value);
    			}

    			if ((changed.project) && raw0_value !== (raw0_value = ctx.project.name)) {
    				h4.innerHTML = raw0_value;
    			}

    			if ((changed.project) && t2_value !== (t2_value = ctx.project.yearStart)) {
    				set_data(t2, t2_value);
    			}

    			if ((changed.project) && raw1_value !== (raw1_value = ctx.project.description)) {
    				p.innerHTML = raw1_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			ctx.button_binding(null);
    			dispose();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { project } = $$props;

      let currentYear = new Date().getFullYear();
      let yearEnd = project.yearEnd == null ? currentYear : '';
      let yearSep = project.yearStart !== project.yearEnd ? '-' : '';

      let projectContainer;

      function showGallery() {
        lightGallery(projectContainer, {
          dynamic: true,
          hideControlOnEnd: true,
          preload: 2,
          download: false,
          dynamicEl: project.images,
          mode: 'lg-slide'
        });
      }

    	const writable_props = ['project'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ProjectCard> was created with unknown prop '${key}'`);
    	});

    	function button_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('projectContainer', projectContainer = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ('project' in $$props) $$invalidate('project', project = $$props.project);
    	};

    	return {
    		project,
    		yearEnd,
    		yearSep,
    		projectContainer,
    		showGallery,
    		button_binding
    	};
    }

    class ProjectCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["project"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.project === undefined && !('project' in props)) {
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

    /* src\components\ContactButton.svelte generated by Svelte v3.7.1 */

    const file$4 = "src\\components\\ContactButton.svelte";

    function create_fragment$4(ctx) {
    	var a, i, i_class_value, t, div, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	return {
    		c: function create() {
    			a = element("a");
    			i = element("i");
    			t = space();
    			div = element("div");

    			if (default_slot) default_slot.c();
    			attr(i, "class", i_class_value = "" + ctx.icon + " mr-1 xs:mr-0 inline-block");
    			attr(i, "aria-hidden", "true");
    			add_location(i, file$4, 13, 2, 637);

    			attr(div, "class", "xs:hidden");
    			add_location(div, file$4, 14, 2, 706);
    			attr(a, "href", ctx.href);
    			attr(a, "class", "mx-2 p-3 py-2 bg-purple-100 text-purple-700  rounded inline-flex items-baseline\r\n  hover:bg-purple-700 hover:text-white xs:text-lg transition-bg transition-color transition-500");
    			add_location(a, file$4, 9, 0, 432);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, a, anchor);
    			append(a, i);
    			append(a, t);
    			append(a, div);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if ((!current || changed.icon) && i_class_value !== (i_class_value = "" + ctx.icon + " mr-1 xs:mr-0 inline-block")) {
    				attr(i, "class", i_class_value);
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!current || changed.href) {
    				attr(a, "href", ctx.href);
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
    			if (detaching) {
    				detach(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { href, icon } = $$props;

    	const writable_props = ['href', 'icon'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<ContactButton> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('href' in $$props) $$invalidate('href', href = $$props.href);
    		if ('icon' in $$props) $$invalidate('icon', icon = $$props.icon);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	return { href, icon, $$slots, $$scope };
    }

    class ContactButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, ["href", "icon"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.href === undefined && !('href' in props)) {
    			console.warn("<ContactButton> was created without expected prop 'href'");
    		}
    		if (ctx.icon === undefined && !('icon' in props)) {
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

    /* src\App.svelte generated by Svelte v3.7.1 */

    const file$5 = "src\\App.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.project = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.skill = list[i];
    	child_ctx.index = i;
    	return child_ctx;
    }

    // (59:4) {:catch error}
    function create_catch_block_1(ctx) {
    	var p, t0, t1_value = ctx.error.message, t1;

    	return {
    		c: function create() {
    			p = element("p");
    			t0 = text("Something went wrong while loading skill list: ");
    			t1 = text(t1_value);
    			add_location(p, file$5, 59, 6, 6473);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t0);
    			append(p, t1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (55:4) {:then value}
    function create_then_block_1(ctx) {
    	var each_blocks = [], each_1_lookup = new Map(), each_1_anchor, current;

    	var each_value_1 = ctx.value;

    	const get_key = ctx => ctx.index;

    	for (var i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block_1$1(key, child_ctx));
    	}

    	return {
    		c: function create() {
    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].c();

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].m(target, anchor);

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			const each_value_1 = ctx.value;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value_1, each_1_lookup, each_1_anchor.parentNode, outro_and_destroy_block, create_each_block_1$1, each_1_anchor, get_each_context_1$1);
    			check_outros();
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value_1.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			for (i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			for (i = 0; i < each_blocks.length; i += 1) each_blocks[i].d(detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (56:6) {#each value as skill, index (index)}
    function create_each_block_1$1(key_1, ctx) {
    	var first, current;

    	var skilllist = new SkillList({
    		props: { skill: ctx.skill },
    		$$inline: true
    	});

    	return {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			skilllist.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert(target, first, anchor);
    			mount_component(skilllist, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var skilllist_changes = {};
    			if (changed.skills) skilllist_changes.skill = ctx.skill;
    			skilllist.$set(skilllist_changes);
    		},

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
    			if (detaching) {
    				detach(first);
    			}

    			destroy_component(skilllist, detaching);
    		}
    	};
    }

    // (53:19)         <p class="has-text-centered">⏳</p>      {:then value}
    function create_pending_block_1(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "⏳";
    			attr(p, "class", "has-text-centered");
    			add_location(p, file$5, 53, 6, 6301);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (78:2) {:catch error}
    function create_catch_block(ctx) {
    	var p, t0, t1_value = ctx.error.message, t1;

    	return {
    		c: function create() {
    			p = element("p");
    			t0 = text("Something went wrong while loading project list: ");
    			t1 = text(t1_value);
    			add_location(p, file$5, 78, 4, 6945);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t0);
    			append(p, t1);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (74:2) {:then value}
    function create_then_block(ctx) {
    	var each_1_anchor, current;

    	var each_value = ctx.value;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c: function create() {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.projects) {
    				each_value = ctx.value;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < each_blocks.length; i += 1) out(i);
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			for (var i = 0; i < each_value.length; i += 1) transition_in(each_blocks[i]);

    			current = true;
    		},

    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < each_blocks.length; i += 1) transition_out(each_blocks[i]);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(each_1_anchor);
    			}
    		}
    	};
    }

    // (75:4) {#each value as project}
    function create_each_block$1(ctx) {
    	var current;

    	var projectcard = new ProjectCard({
    		props: { project: ctx.project },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			projectcard.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(projectcard, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var projectcard_changes = {};
    			if (changed.projects) projectcard_changes.project = ctx.project;
    			projectcard.$set(projectcard_changes);
    		},

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
    }

    // (72:19)       <p class="has-text-centered">⏳</p>    {:then value}
    function create_pending_block(ctx) {
    	var p;

    	return {
    		c: function create() {
    			p = element("p");
    			p.textContent = "⏳";
    			attr(p, "class", "has-text-centered");
    			add_location(p, file$5, 72, 4, 6794);
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    // (98:4) <ContactButton href="mailto:goran.alkovic@hotmail.com" icon="icon-envelope">
    function create_default_slot_2(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("E-mail");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (101:4) <ContactButton        href="https://github.com/goranalkovic"        icon="icon-social-github">
    function create_default_slot_1(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("GitHub");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    // (106:4) <ContactButton href="tel:+385976480800" icon="icon-phone">
    function create_default_slot(ctx) {
    	var t;

    	return {
    		c: function create() {
    			t = text("Mobile");
    		},

    		m: function mount(target, anchor) {
    			insert(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(t);
    			}
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var t0, div1, h10, t2, div0, promise, t3, div3, h11, t5, div2, promise_1, t6, p0, t8, p1, t10, footer, h4, t12, div4, t13, t14, current;

    	var hero = new Hero({ $$inline: true });

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block_1,
    		value: 'value',
    		error: 'error',
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.skills, info);

    	let info_1 = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 'value',
    		error: 'error',
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = ctx.projects, info_1);

    	var contactbutton0 = new ContactButton({
    		props: {
    		href: "mailto:goran.alkovic@hotmail.com",
    		icon: "icon-envelope",
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var contactbutton1 = new ContactButton({
    		props: {
    		href: "https://github.com/goranalkovic",
    		icon: "icon-social-github",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var contactbutton2 = new ContactButton({
    		props: {
    		href: "tel:+385976480800",
    		icon: "icon-phone",
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			hero.$$.fragment.c();
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
    			contactbutton0.$$.fragment.c();
    			t13 = space();
    			contactbutton1.$$.fragment.c();
    			t14 = space();
    			contactbutton2.$$.fragment.c();
    			attr(h10, "class", "text-3xl text-center px-4 py-2 text-purple-600 select-none");
    			add_location(h10, file$5, 47, 2, 6103);
    			attr(div0, "class", "flex w-full flex-wrap justify-center max-w-6xl mx-auto");
    			add_location(div0, file$5, 51, 2, 6204);
    			attr(div1, "class", "p-8 pb-0");
    			add_location(div1, file$5, 46, 0, 6077);
    			attr(h11, "class", "text-3xl text-center px-4 py-2 text-purple-600 select-none");
    			add_location(h11, file$5, 65, 2, 6599);
    			attr(div2, "class", "flex flex-wrap w-full justify-center max-w-6xl mx-auto");
    			add_location(div2, file$5, 69, 0, 6697);
    			attr(div3, "class", "p-8");
    			add_location(div3, file$5, 64, 0, 6578);
    			attr(p0, "class", "text-center text-gray-500 pt-4 select-none");
    			add_location(p0, file$5, 84, 0, 7050);
    			attr(p1, "class", "text-center text-gray-200 pb-4 select-none");
    			add_location(p1, file$5, 85, 0, 7136);
    			attr(h4, "class", " sm-max:mb-2 sm-max:mr-0 mb-0 xs:mr-1 mr-2 text-lg font-semibold");
    			add_location(h4, file$5, 93, 2, 7458);
    			attr(div4, "class", "flex");
    			add_location(div4, file$5, 96, 2, 7566);
    			attr(footer, "class", "flex flex-row sm-max:flex-col bg-white p-5 items-center\r\n  md:items-baseline justify-center sticky bottom-0 shadow-2xl bg-texture-footer\r\n  rounded-tr-lg rounded-tl-lg select-none svelte-1eekzhd");
    			add_location(footer, file$5, 89, 0, 7255);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(hero, target, anchor);
    			insert(target, t0, anchor);
    			insert(target, div1, anchor);
    			append(div1, h10);
    			append(div1, t2);
    			append(div1, div0);

    			info.block.m(div0, info.anchor = null);
    			info.mount = () => div0;
    			info.anchor = null;

    			insert(target, t3, anchor);
    			insert(target, div3, anchor);
    			append(div3, h11);
    			append(div3, t5);
    			append(div3, div2);

    			info_1.block.m(div2, info_1.anchor = null);
    			info_1.mount = () => div2;
    			info_1.anchor = null;

    			insert(target, t6, anchor);
    			insert(target, p0, anchor);
    			insert(target, t8, anchor);
    			insert(target, p1, anchor);
    			insert(target, t10, anchor);
    			insert(target, footer, anchor);
    			append(footer, h4);
    			append(footer, t12);
    			append(footer, div4);
    			mount_component(contactbutton0, div4, null);
    			append(div4, t13);
    			mount_component(contactbutton1, div4, null);
    			append(div4, t14);
    			mount_component(contactbutton2, div4, null);
    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (promise !== (promise = ctx.skills) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved));
    			}

    			info_1.ctx = ctx;

    			if (promise_1 !== (promise_1 = ctx.projects) && handle_promise(promise_1, info_1)) ; else {
    				info_1.block.p(changed, assign(assign({}, ctx), info_1.resolved));
    			}

    			var contactbutton0_changes = {};
    			if (changed.$$scope) contactbutton0_changes.$$scope = { changed, ctx };
    			contactbutton0.$set(contactbutton0_changes);

    			var contactbutton1_changes = {};
    			if (changed.$$scope) contactbutton1_changes.$$scope = { changed, ctx };
    			contactbutton1.$set(contactbutton1_changes);

    			var contactbutton2_changes = {};
    			if (changed.$$scope) contactbutton2_changes.$$scope = { changed, ctx };
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

    			if (detaching) {
    				detach(t0);
    				detach(div1);
    			}

    			info.block.d();
    			info.token = null;
    			info = null;

    			if (detaching) {
    				detach(t3);
    				detach(div3);
    			}

    			info_1.block.d();
    			info_1.token = null;
    			info_1 = null;

    			if (detaching) {
    				detach(t6);
    				detach(p0);
    				detach(t8);
    				detach(p1);
    				detach(t10);
    				detach(footer);
    			}

    			destroy_component(contactbutton0);

    			destroy_component(contactbutton1);

    			destroy_component(contactbutton2);
    		}
    	};
    }

    async function loadSkills() {
      // await sleep(2000);
      let response = await fetch('files/cv.json');
      return response.json();
    }

    async function loadProjects() {
      let response = await fetch('files/projects.json');
      return response.json();
    }

    function instance$4($$self) {
    	

      let skills = loadSkills();
      let projects = loadProjects();

    	return { skills, projects };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, []);
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
