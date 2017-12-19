using Synapse.Core;

namespace ModularUI.Modules.PlanExecution.Helpers
{
    public static class StatusHelper
    {

        private struct Color
        {
            public const string Black = "#666";
            public const string Blue = "#009";
            public const string Green = "#007833";
            public const string Red = "#f00";
            public const string Orange = "#f60";
            public const string Pink = "#f7f";
        }
        public static string GetColor(StatusType status)
        {
            switch (status)
            {
                case StatusType.None:
                case StatusType.Running:
                case StatusType.Waiting:
                case StatusType.Cancelling:
                case StatusType.Any:
                    return Color.Black;
                case StatusType.New:
                case StatusType.Initializing:
                    return Color.Blue;
                case StatusType.Complete:
                    //case StatusType.Success:  // carries the same value as Complete
                    return Color.Green;
                case StatusType.CompletedWithErrors:
                    //case StatusType.SuccessWithErrors:  // carries the same value as CompletedWithErrors
                    return Color.Orange;
                case StatusType.Failed:
                    return Color.Red;
                case StatusType.Cancelled:
                case StatusType.Tombstoned:
                    return Color.Pink;
                default:
                    return Color.Black;
            }
        }
    }
}
