import type { JSX, ParentProps } from 'solid-js'
import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Suspense,
} from 'solid-js'

function Foo(props: ParentProps): JSX.Element {
  const [count, setCount] = createSignal(0)

  onMount(() => {
    console.log('mounted')

    onCleanup(() => {
      console.log('unmounted')
    })
  })

  createEffect(() => {
    console.log('count:', count())
  })

  return (
    <>
      Children:
      <Suspense fallback="loading...">{props.children}</Suspense>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </>
  )
}

export default Foo
