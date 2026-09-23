import type { JSX } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import {
  createEffect,
  createSignal,
  onCleanup,
  onSettled,
  Loading,
} from "solid-js";

function Foo(props: ParentProps): JSX.Element {
  const [count, setCount] = createSignal(0);

  onSettled(() => {
    console.log("mounted");

    onCleanup(() => {
      console.log("unmounted");
    });
  });

  createEffect(count, (value) => {
    console.log("count:", value);
  });

  return (
    <>
      Children:
      <Loading fallback="loading...">{props.children}</Loading>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </>
  );
}

export default Foo;
