---
layout: post
title: "Lessons from the American Express Default Prediction Kaggle competition"
---

-   What I did
    -   25/06/2022
        -   Worked on a submission with polars + xgboost, following cdotte's
            baseline submission.
            Next steps are to implement KFold CV and understand why performance
            is so low, am I messing something up when merging the IDs and
            effectively making a random submission?
            -   Both zeros and randoms results in 0.020
            -   Ok I was doing something wrong with the merging of IDs, let's
                see if it looks correct now
            -   It works now, 0.762 by keeping both customer_ID and its hash in
                a column called ID. Then I groupby ID. Why do I even bother with
                doing this though?
            -   Next is cross validation. 5-fold CV on full dataset takes 30m.
            -   I tried predicting the test set using the output of the last
                fold. In theory this should scorea about 0.788.
                Indeed it performs 0.786
            -   What can I do next? I would like to reach that 0.793
                -   Feature engineering just like in the notebook
                -   FillNa with -127
                -   Mean ensemble the models from every fold
                -   Because now mine kfold estimate is 0.788 while his is 0.791
                    And my LB is 0.786 while his is 0.793
                -   See what else I have missed
    -   23/06/2022
        -   Read all notebooks in votes order starting from most voted
    -   22/06/2022
        -   Read all discussions in chronological order starting from oldest

TODO(Andrea): re-read all discussions by grandmasters (such as AmbrosM, CDeotte, Raddar)
TODO(Andrea): re-read read all notebooks by grandmasters
TODO(Andrea): read all comments by grandmasters

## Main topics

-   Reducing memory usage
    -   Lots of columns are categorical/ordinal with some uniform noise added that we can denoise and then store in a int8.
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328514
    -   Split data into 10 files with 50k customers, then you can load each one on the GPU and do feature engineering one at a time.
        Also, most models allow training on chunked data.
    -   Use int8, float16, etc.
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328054

-   Exploring the datasets and its features
    -   Feature S_2 is a date and there are multiple dates per customer_ID
        -   There is value in treating this as a time-series, CDeotte says his best Transformer+GRU beats his best GBT
            -   Lots of features have seasonality patterns.
                See notebook: https://www.kaggle.com/code/pavelvod/amex-eda-revealing-time-patterns-of-features/comments
                See discussion: https://www.kaggle.com/code/pavelvod/amex-eda-even-more-insane-time-patterns-revealed/notebook
        -   Some people just look at the last item in this timeseries, so one row per customer_ID
        -   Not all customers have 13 dates.
            Apparently short-term customers have higher risk 43% but gap customers 27% and long-term customers 23% are similar
    -   Features B_29, S_9, D_87 have different distributions of missing values between train and test
        See notebook: https://www.kaggle.com/code/ambrosm/amex-eda-which-makes-sense
    -   Good EDA with nice plots, useful for seeing the distribution of features
        See notebook: https://www.kaggle.com/code/kellibelcher/amex-default-prediction-eda-lgbm-baseline
    -   Missing values are not missing-at-random
        See notebook: https://www.kaggle.com/code/raddar/understanding-na-values-in-amex-competition/notebook
    -   Good timeseries EDA
        See notebook: https://www.kaggle.com/code/pavelvod/amex-eda-revealing-time-patterns-of-features/notebook

-   Understanding the metric
    -   TODO(Andrea): finish
-   Fast metric implementations
    -   TODO(Andrea): finish

-   Cross-Validation
    -   5-fold StratifiedKFold because the target classes are imbalanced (26% true, 74% false)
    -   TODO(Andrea): what's StratifiedGroupKFold?

-   Baselines (all use 5 folds)
    -   GBDT
        -   XGBoost
            See notebook: https://www.kaggle.com/code/cdeotte/xgboost-starter-0-793
            See notebook: https://www.kaggle.com/code/jiweiliu/rapids-cudf-feature-engineering-xgb/notebook (nice code layout)
            -   uses dataset `amex-data-integer-dtypes-parquet-format`
            -   uses only last observation per customer
            -   creates features by computing, grouping over observations:
                -   The mean, std, min, max, last of numerical features.
                -   The count, last, nunique of categorical features.
            -   Takes 13m
        -   LGBM
            See notebook: https://www.kaggle.com/code/ambrosm/amex-lightgbm-quickstart
            -   uses dataset `amex-data-integer-dtypes-parquet-format`
            -   uses only last observation per customer
            -   creates features by computing, grouping over observations:
                -   mean, min, max, last of numerical features.
            -   Takes 40m
        -   LGBM + DART (Dropout meets multiple Additive Regression Trees)
            See notebook: https://www.kaggle.com/code/ragnar123/amex-lgbm-dart-cv-0-7963
            -   Same feature engineering as XGBoos
            -   Nice structure
            -   To use DART with Early Stopping see comments and also the
                discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/332575
        -   Catboost
            See notebook: https://www.kaggle.com/code/huseyincot/amex-catboost-0-793/notebook
            And notebook: https://www.kaggle.com/code/jiweiliu/amex-catboost-rounding-trick
            -   Uses a weird pickled dataset. If you apply the same rounding trick that removes the uniform noise performance is much better
            -   Takes 8h
    -   NN
        -   RNN with GRU
            See notebook: https://www.kaggle.com/code/cdeotte/tensorflow-gru-starter-0-790
            -   Uses 3D dataset (customer x 13 x 188): https://www.kaggle.com/datasets/cdeotte/amex-data-for-transformers-and-rnns
            -   No scaling or feature engineering, label encoding of categorical columns
        -   Transformer
            See notebook: https://www.kaggle.com/code/cdeotte/tensorflow-transformer-0-790/comments
        -   Dense NN
            See notebook: https://www.kaggle.com/code/ambrosm/amex-keras-quickstart-1-training
            See notebook: https://www.kaggle.com/code/ambrosm/amex-keras-quickstart-2-inference
            -   Feature engineering
                -   avg, min, max, last
                -   categorical
            -   Takes 1h30m
            -   Very interesting comments: https://www.kaggle.com/code/ambrosm/amex-keras-quickstart-1-training/comments
        -   TabNet
            See notebook: https://www.kaggle.com/code/hinepo/amex-tabnet-training/comments

-   How to move beyond 0.795? See the comments by Raddar
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/331454

-   Public LB vs Private LB
    -   Public LB: customers whose statement is in 2019-04
        Private LB: customers whose statement is in 2019-10
        See notebook: https://www.kaggle.com/code/ambrosm/amex-eda-which-makes-sense
    -   See if there are differences between the two, such as B_29.
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328756
    -   Adversarial validation (nice since we know public and private LBs)
        See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/330931
        See notebook: https://www.kaggle.com/code/zakopur0/adversarial-validation-private-vs-public
        B_29 is a perfect predictor of public vs private
        Let's keep going...

---

-   META: summary of the learnings (posted on 2 Jun)
    See discussion here: https://www.kaggle.com/competitions/amex-default-prediction/discussion/328565

---

## Topics I have just seen but not read

-   EDA with nonlinear clustering algorithms like UMAP/t-SNE

-   Understand feature interactions via xgboost.
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/329094

-   Ensembling probabilites via log-odds.
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/329103

-   Permutation feature importance:
    See discussion: https://www.kaggle.com/competitions/amex-default-prediction/discussion/331131

-   Feature P_2 is an internal credit rating, Feature D_39 is days_overdue
    See notebook: https://www.kaggle.com/code/raddar/deanonymized-days-overdue-feat-amex
    TODO(Andre): read more into this

-   Learning to rank to (try to) recover time features
    See notebook: https://www.kaggle.com/code/raddar/learning-to-rank-time-related-features

-   A faster self-attention? cool...
    See notebook: https://www.kaggle.com/code/mayukh18/amex-cossquareformer-starter/notebook