import { enqueueSnackbar, VariantType, OptionsWithExtraProps, SnackbarKey } from 'notistack';

export const toast = <V extends VariantType>(message: string | Error, options?: OptionsWithExtraProps<V>): SnackbarKey => {
  const formattedMessage = message instanceof Error ? message.message || message.toString() : message;

  return enqueueSnackbar(formattedMessage, { variant: message instanceof Error ? 'error' : 'default', ...options });
};
