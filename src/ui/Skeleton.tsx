import styles from "./Skeleton.module.css"

export function Skeleton({ height = 160 }: { height?: number }) {
  return <div className={ styles.skeleton } style={ { height } }/>
}
