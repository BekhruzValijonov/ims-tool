import { useNavigate, useParams } from "react-router-dom"
import { ROUTES } from "../app/routes"
import { PageHeader } from "../shared/ui/PageHeader"
import { FormPageActions, InstrumentForm } from "../features/instruments/ui/InstrumentForm"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { Page } from "../ui/Page"
import { IconArrowLeft } from "../ui/icons"

/**
 * Правка прибора.
 *
 * Заведение нового прибора живёт в окне на списке приборов: его открывают
 * походя, из любого места. Правка — отдельная страница: в неё приходят
 * осознанно, из карточки, и уходить со страницы при этом некуда.
 */
export function InstrumentFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <Page maxWidth={ 900 }>
      <Button
        startIcon={ <IconArrowLeft size={ 18 }/> }
        onClick={ () => navigate(-1) }
        style={ { marginLeft: -12, marginBottom: 8 } }
      >
        Назад
      </Button>
      <PageHeader
        title="Редактирование прибора"
        hint="Правка паспорта. Состояние и держатель меняются операциями из карточки."
      />

      <Card>
        <InstrumentForm
          instrumentId={ id }
          onSaved={ (savedId) => navigate(ROUTES.instrument(savedId)) }
          renderActions={ ({ busy, submitLabel }) => (
            <FormPageActions busy={ busy } submitLabel={ submitLabel } onCancel={ () => navigate(-1) }/>
          ) }
        />
      </Card>
    </Page>
  )
}
